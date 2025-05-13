// app.js
const Terminal = window.Terminal;
const FitAddon = window.FitAddon.FitAddon;

import * as ui from './ui.js';
import * as output from './output.js';
import * as input from './input.js';

const term = new Terminal({
    cursorBlink: true, scrollback: 1000, tabStopWidth: 4, convertEol: true,
    theme: { background: '#1e1e1e', foreground: '#ffffff', cursor: '#ffffff', selection: 'rgba(255, 255, 255, 0.3)', black: '#000000', red: '#cc0000', green: '#4e9a06', yellow: '#c4a000', blue: '#3465a4', magenta: '#75507b', cyan: '#06989a', white: '#d3d7cf', brightBlack: '#555753', brightRed: '#ef2929', brightGreen: '#8ae234', brightYellow: '#fce94f', brightBlue: '#729fcf', brightMagenta: '#ad7fa8', brightCyan: '#34e2e2', brightWhite: '#eeeeec' }
});
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

const xtermContainer = document.getElementById('xterm-container');
if (!xtermContainer) console.error("FATAL: xterm-container DOM element not found!");
else term.open(xtermContainer); 

output.initOutput(term);

const simWorker = new Worker('sim-engine.js', { type: 'module' });
let currentPromptString = '$ '; // This will be updated by input.js and simWorker
let currentSimulatedCwdArray = ['']; 

const handleInputEvent = (event) => {
    switch (event.type) {
        case 'commandReady':
            term.write('\r\n'); 
            const command = event.command;
            if (command.length > 0) {
                if (command === 'clear') { 
                    term.clear(); 
                    redrawInputLine(); 
                    term.focus(); 
                } else if (command === 'menu') { 
                    ui.showMenu(); 
                    term.clear(); 
                    simWorker.postMessage({ type: 'resetLevel' }); 
                } else if (command === 'resetLevel') { 
                    simWorker.postMessage({ type: 'resetLevel' }); 
                } else { 
                    input.disableInput(); 
                    term.options.cursorBlink = false; 
                    simWorker.postMessage({ type: 'command', command: command }); 
                }
            } else { 
                redrawInputLine(); 
                term.focus(); 
            }
            break;
        case 'bufferUpdate': // Fired for typing, cursor moves, backspace, delete, ctrl+u/k
        case 'historyNav':   // Fired for arrow up/down
            redrawInputLine(); 
            break;
        case 'interrupt': // Ctrl+C
            term.write('^C\r\n'); 
            // input.js already cleared its buffer
            redrawInputLine(); 
            term.focus(); 
            break;
        case 'tabPressed':
            if (event.domEvent) event.domEvent.preventDefault(); // Should be handled in input.js
            input.disableInput(); 
            term.options.cursorBlink = false;
            // Pass current cursor position if needed by sim-engine for context-aware completion
            simWorker.postMessage({ 
                type: 'getCompletionCandidates', 
                buffer: input.getBuffer(), 
                cursorPos: input.getCursorPos(), // Pass cursor pos for completion
                cwd: currentSimulatedCwdArray 
            });
            break;
        default: 
            console.warn('Unknown input event:', event.type, event);
    }
};

simWorker.onmessage = ({ data }) => {
    console.log('App <- Worker:', data.type, data);
    if (data.type !== 'levelComplete' && data.type !== 'objectiveComplete') { 
        input.enableInput(); 
        term.options.cursorBlink = true; 
    }
    if (data.newPrompt !== undefined) { 
        currentPromptString = data.newPrompt; 
        input.updatePromptString(currentPromptString); 
    }
    if (data.simulatedCwd) {
        currentSimulatedCwdArray = data.simulatedCwd;
    }

    switch (data.type) {
        case 'levelLoaded':
            ui.showTerminal();
            if (!term.element && xtermContainer) term.open(xtermContainer);
            fitAddon.fit(); 
            term.clear();
            ui.setLevelInfo(data.levelName || 'N/A', data.description || 'Aucune description.');
            ui.setObjectives(data.objectives || []);
            ui.setHints(data.hints || []);
            redrawInputLine(); 
            input.disableInput(); 
            term.options.cursorBlink = false;
            output.displayOutput((data.description || '') + '\r\n\r\n', 10, () => {
                input.enableInput(); 
                term.options.cursorBlink = true; 
                term.focus(); 
                fitAddon.fit();
                redrawInputLine(); // Redraw after description to ensure prompt is correct
            });
            break;
        case 'output':
            input.disableInput(); 
            term.options.cursorBlink = false;
            // Output from worker should end with a newline if it's block output
            // If it doesn't, ensure our prompt starts on a new line after it.
            const needsNewlineBeforePrompt = data.output && !data.output.endsWith('\n');
            if (needsNewlineBeforePrompt) term.write('\r\n');

            output.displayOutput(data.output, typeof data.speed === 'number' ? data.speed : 0, () => {
                redrawInputLine(); 
                input.enableInput(); 
                term.options.cursorBlink = true; 
                term.focus();
            });
            break;
        case 'completionCandidates':
            const candidates = data.candidates;
            const originalBuffer = input.getBuffer();
            const originalCursorPos = input.getCursorPos();

            if (candidates && candidates.length > 0) {
                if (candidates.length === 1) {
                    let completion = candidates[0];
                    // Logic to insert completion at cursor
                    const textBeforeCursor = originalBuffer.substring(0, data.prefixLength !== undefined ? originalCursorPos - data.prefixLength : 0); // data.prefixLength from worker
                    const textAfterCursor = originalBuffer.substring(originalCursorPos);
                    
                    let newBuffer;
                    let newCursorPos;

                    if (data.isPathCompletion) { // Worker indicates if it's a path
                        const baseInput = originalBuffer.substring(0, originalCursorPos - (data.segmentToReplace || "").length);
                        newBuffer = baseInput + completion;
                        newCursorPos = newBuffer.length;
                         // Remove trailing space if it's a directory for further typing
                        if (completion.endsWith('/') && newBuffer.endsWith(' /')) {
                            newBuffer = newBuffer.slice(0, -1);
                            newCursorPos--;
                        } else if (!completion.endsWith('/') && newBuffer.endsWith(' ')) {
                            // keep space for files/commands
                        }


                    } else { // Command or option completion
                         const lastSpace = originalBuffer.lastIndexOf(' ', originalCursorPos -1) + 1;
                         newBuffer = originalBuffer.substring(0, lastSpace) + completion;
                         newCursorPos = newBuffer.length;
                    }
                    
                    input.setBuffer(newBuffer); // setBuffer in input.js now also sets cursor to end
                    redrawInputLine();

                } else { // Multiple candidates
                    term.write('\r\u001b[K'); 
                    output.prompt(input.getPromptString() + ' '); 
                    term.write(input.getBuffer()); // Write current buffer
                    // Move cursor to its logical position before printing candidates
                    const currentBuffer = input.getBuffer();
                    const currentCursorPos = input.getCursorPos();
                    if (currentBuffer.length > currentCursorPos) {
                        term.write(`\u001b[${currentBuffer.length - currentCursorPos}D`);
                    }
                    // Print candidates on new lines
                    term.write('\r\n' + candidates.join('  ') + '\r\n'); 
                    redrawInputLine(); // Redraw the prompt and buffer line
                }
            } else {
                term.write('\u0007'); // Beep
            }
            input.enableInput(); 
            term.options.cursorBlink = true; 
            term.focus();
            break;
        case 'objectiveComplete':
            input.disableInput(); 
            term.options.cursorBlink = false; 
            term.write('\r\u001b[K'); // Clear current input line
            const objMsg = `\x1b[1;32m[OBJECTIF ACCOMPLI]\x1b[0m ${data.message || 'Objectif atteint.'}\r\n`;
            output.displayOutput(objMsg, 0, () => {
                ui.markObjectiveCompleted(data.objectiveId); 
                redrawInputLine();
                input.enableInput(); 
                term.options.cursorBlink = true; 
                term.focus();
            });
            break;
        case 'levelComplete':
            input.disableInput(); 
            term.options.cursorBlink = false; 
            term.write('\r\u001b[K'); // Clear current input line
            const compMsg = `\x1b[1;33m[MISSION ACCOMPLIE]\x1b[0m ${data.message || 'Mission terminée!'}\r\n\r\nAppuyez sur Entrée...\r\n`;
            output.displayOutput(compMsg, 0, () => {
                input.waitForEnter(() => { 
                    ui.showMenu(); 
                    term.clear(); 
                    simWorker.postMessage({ type: 'resetLevel' }); // Reset worker state for next load
                });
            });
            break;
        case 'promptUpdate': 
            redrawInputLine(); 
            term.focus(); 
            break;
        default: 
            console.warn('App unhandled worker msg:', data.type); 
            if (typeof input.enableInput === 'function' && typeof term !== 'undefined' && term.options) {
                 input.enableInput(); term.options.cursorBlink = true; term.focus();
            }
            break;
    }
};

function redrawInputLine() {
    if (!term || typeof term.write !== 'function' || 
        typeof output.prompt !== 'function' || 
        typeof input.getPromptString !== 'function' || 
        typeof input.getBuffer !== 'function' ||
        typeof input.getCursorPos !== 'function') { // Check for new function
        console.error("redrawInputLine: term or dependent functions not available.");
        return;
    }

    term.write('\r\u001b[K'); // CSI Ps K: Erase in Line. \r moves to col 0. K clears from cursor to end.
                             // So, effectively clears the current line.
    
    const promptStr = input.getPromptString() + ' '; // Get current prompt string with a space
    output.prompt(promptStr); // output.js writes the prompt (it handles \n to \r\n itself)
    
    const buffer = input.getBuffer();
    term.write(buffer); // Write the actual buffer content

    // After writing the buffer, the terminal's physical cursor is at the end of the buffer.
    // We need to move it to the logical cursor position (_cursorPos in input.js).
    const cursorPos = input.getCursorPos(); // Logical cursor position within the buffer string
    
    if (buffer.length > cursorPos) {
        // \u001b[<N>D moves cursor left N times
        term.write(`\u001b[${buffer.length - cursorPos}D`); 
    }
    // If cursorPos === buffer.length, the cursor is already correctly at the end.
}


input.initInput(term, handleInputEvent);
input.updatePromptString(currentPromptString); // Initialize input module with default prompt

document.querySelectorAll('#level-menu-content .level-list li').forEach(item => {
    item.addEventListener('click', () => {
        const levelId = item.dataset.levelId;
        if (!levelId) { console.error("Level item has no data-level-id:", item); return; }
        
        ui.showTerminal();
        if (!term.element && xtermContainer) term.open(xtermContainer);
        
        if (typeof fitAddon !== 'undefined' && typeof fitAddon.fit === 'function' && term.element) {
            fitAddon.fit();
        } else {
            console.warn("fitAddon not available or terminal not attached for initial fit.");
        }
        term.clear();
        term.writeln(`Chargement : ${item.textContent || levelId}...`);
        input.disableInput(); 
        term.options.cursorBlink = false;
        simWorker.postMessage({ type: 'loadLevel', levelId: levelId });
    });
});

window.addEventListener('resize', () => {
    if (term.element && ui.terminalContainer && !ui.terminalContainer.classList.contains('hidden') && 
        typeof fitAddon !== 'undefined' && typeof fitAddon.fit === 'function') {
        fitAddon.fit(); 
        redrawInputLine(); 
        term.focus();
    }
});

if (xtermContainer && !term.element) {
    term.open(xtermContainer);
}
if (typeof fitAddon !== 'undefined' && typeof fitAddon.fit === 'function' && term.element) {
    fitAddon.fit(); 
}

ui.showMenu();