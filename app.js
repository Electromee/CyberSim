// app.js
const Terminal = window.Terminal;
const FitAddon = window.FitAddon.FitAddon;

import * as ui from './ui.js';
import * as output from './output.js';
import * as input from './input.js';

const term = new Terminal({
    cursorBlink: true, scrollback: 1000, tabStopWidth: 4, convertEol: true, // Added convertEol
    theme: { background: '#1e1e1e', foreground: '#ffffff', cursor: '#ffffff', selection: 'rgba(255, 255, 255, 0.3)', black: '#000000', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000', blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf', brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f', brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec' }
});
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

const xtermContainer = document.getElementById('xterm-container');
if (!xtermContainer) console.error("FATAL: xterm-container DOM element not found!");
else term.open(xtermContainer); 

output.initOutput(term);

const simWorker = new Worker('sim-engine.js', { type: 'module' });
let currentPromptString = '$ ';
let currentSimulatedCwdArray = ['']; 

const handleInputEvent = (event) => {
    switch (event.type) {
        case 'commandReady':
            term.write('\r\n'); const command = event.command;
            if (command.length > 0) {
                if (command === 'clear') { term.clear(); redrawInputLine(); term.focus(); }
                else if (command === 'menu') { ui.showMenu(); term.clear(); simWorker.postMessage({ type: 'resetLevel' }); } // Reset worker state for consistency
                else if (command === 'resetLevel') { simWorker.postMessage({ type: 'resetLevel' }); }
                else { input.disableInput(); term.options.cursorBlink = false; simWorker.postMessage({ type: 'command', command: command }); }
            } else { redrawInputLine(); term.focus(); }
            break;
        case 'bufferUpdate': case 'historyNav': redrawInputLine(); break;
        case 'interrupt': term.write('^C\r\n'); input.setBuffer(''); redrawInputLine(); term.focus(); break;
        case 'tabPressed':
            if (event.domEvent) event.domEvent.preventDefault();
            input.disableInput(); term.options.cursorBlink = false;
            simWorker.postMessage({ type: 'getCompletionCandidates', buffer: input.getBuffer(), cwd: currentSimulatedCwdArray });
            break;
        default: console.warn('Unknown input event:', event.type, event);
    }
};

simWorker.onmessage = ({ data }) => {
    console.log('App <- Worker:', data.type, data); // Keep this for debugging
    if (data.type !== 'levelComplete' && data.type !== 'objectiveComplete') { input.enableInput(); term.options.cursorBlink = true; } // Re-enable for most
    if (data.newPrompt !== undefined) { currentPromptString = data.newPrompt; input.updatePromptString(currentPromptString); }
    if (data.simulatedCwd) currentSimulatedCwdArray = data.simulatedCwd;

    switch (data.type) {
        case 'levelLoaded':
            ui.showTerminal();
            if (!term.element && xtermContainer) term.open(xtermContainer);
            fitAddon.fit(); term.clear();
            ui.setLevelInfo(data.levelName || 'N/A', data.description || 'Aucune description.');
            ui.setObjectives(data.objectives || []);
            ui.setHints(data.hints || []);
            redrawInputLine(); 
            input.disableInput(); term.options.cursorBlink = false;
            output.displayOutput((data.description || '') + '\r\n\r\n', 10, () => { // Welcome message speed
                input.enableInput(); term.options.cursorBlink = true; term.focus(); fitAddon.fit();
            });
            break;
        case 'output':
            input.disableInput(); term.options.cursorBlink = false;
            output.displayOutput(data.output, typeof data.speed === 'number' ? data.speed : 0, () => {
                redrawInputLine(); input.enableInput(); term.options.cursorBlink = true; term.focus();
            });
            break;
        case 'completionCandidates':
            const candidates = data.candidates;
            if (candidates && candidates.length > 0) {
                if (candidates.length === 1) {
                    let completed = candidates[0]; 
                    input.setBuffer(completed.trimEnd() + (completed.endsWith('/') ? '' : ' ')); // Add space if not dir
                    redrawInputLine();
                } else {
                    term.write('\r\u001b[K'); 
                    output.prompt(input.getPromptString() + ' '); term.write(input.getBuffer());
                    term.write('\r\n' + candidates.join('  ') + '\r\n'); redrawInputLine();
                }
            } else term.write('\u0007'); // Beep
            input.enableInput(); term.options.cursorBlink = true; term.focus();
            break;
        case 'objectiveComplete':
            input.disableInput(); term.options.cursorBlink = false; term.write('\r\u001b[K');
            const objMsg = `\x1b[1;32m[OBJECTIF ACCOMPLI]\x1b[0m ${data.message || 'Objectif atteint.'}\r\n`;
            output.displayOutput(objMsg, 0, () => {
                ui.markObjectiveCompleted(data.objectiveId); redrawInputLine();
                input.enableInput(); term.options.cursorBlink = true; term.focus();
            });
            break;
        case 'levelComplete':
            input.disableInput(); term.options.cursorBlink = false; term.write('\r\u001b[K');
            const compMsg = `\x1b[1;33m[MISSION ACCOMPLIE]\x1b[0m ${data.message || 'Mission terminée!'}\r\n\r\nAppuyez sur Entrée...\r\n`;
            output.displayOutput(compMsg, 0, () => {
                input.waitForEnter(() => { ui.showMenu(); term.clear(); /* Worker state resets on next loadLevel */ });
            });
            break;
        case 'promptUpdate': redrawInputLine(); term.focus(); break;
        default: 
            console.warn('App unhandled worker msg:', data.type); 
            // Safety: re-enable input if an unknown message type might have left it disabled
            if (typeof input.enableInput === 'function' && typeof term !== 'undefined' && term.options) { // Check existence before calling
                 input.enableInput(); term.options.cursorBlink = true; term.focus();
            }
            break;
    }
};

function redrawInputLine() {
    if (!term || typeof term.write !== 'function' || typeof output.prompt !== 'function' || typeof input.getPromptString !== 'function' || typeof input.getBuffer !== 'function') {
        console.error("redrawInputLine: term or dependent functions not available.");
        return;
    }
    term.write('\r\u001b[K'); 
    output.prompt(input.getPromptString() + ' '); 
    term.write(input.getBuffer()); 
}

input.initInput(term, handleInputEvent);
input.updatePromptString(currentPromptString);

document.querySelectorAll('#level-menu-content .level-list li').forEach(item => {
    item.addEventListener('click', () => {
        const levelId = item.dataset.levelId;
        if (!levelId) { console.error("Level item has no data-level-id:", item); return; }
        ui.showTerminal();
        if (!term.element && xtermContainer) term.open(xtermContainer); // Ensure opened
        
        // Ensure fitAddon is available and terminal is attached
        if (typeof fitAddon !== 'undefined' && typeof fitAddon.fit === 'function' && term.element) {
            fitAddon.fit();
        } else {
            console.warn("fitAddon not available or terminal not attached for initial fit.");
        }
        term.clear();
        term.writeln(`Chargement : ${item.textContent || levelId}...`);
        input.disableInput(); term.options.cursorBlink = false;
        simWorker.postMessage({ type: 'loadLevel', levelId: levelId });
    });
});

window.addEventListener('resize', () => {
    if (term.element && ui.terminalContainer && !ui.terminalContainer.classList.contains('hidden') && typeof fitAddon !== 'undefined' && typeof fitAddon.fit === 'function') {
        fitAddon.fit(); redrawInputLine(); term.focus();
    }
});

// Initial setup
if (xtermContainer && !term.element) { // Ensure terminal is opened on page load if container exists
    term.open(xtermContainer);
}
if (typeof fitAddon !== 'undefined' && typeof fitAddon.fit === 'function' && term.element) { // Fit it once opened
    fitAddon.fit(); 
}
ui.showMenu();