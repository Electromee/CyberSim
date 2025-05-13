// input.js
let _term = null, _currentPromptString = '$ ', _history = [], _historyIndex = -1, _buffer = '', 
    _eventCallback = null, _inputEnabled = false, _waitForEnterCallback = null;

export function initInput(termInstance, eventCallback) {
    if (_term) { console.warn('Input init multiple times.'); return; }
    _term = termInstance; _eventCallback = eventCallback; _inputEnabled = true; 
    _term.onKey(({ key, domEvent }) => {
        if (!_eventCallback) return;
        if (!_inputEnabled) {
             if (domEvent.key === 'Enter' && _waitForEnterCallback) {
                  domEvent.preventDefault(); const cb = _waitForEnterCallback; _waitForEnterCallback = null; cb(); 
             } return; 
        }
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey && domEvent.key.length === 1 && domEvent.keyCode !== 229 && !(domEvent.keyCode >= 112 && domEvent.keyCode <=123) /*F-keys*/;

        switch (domEvent.key) {
            case 'Enter':
                domEvent.preventDefault(); const cmd = _buffer.trim(); _buffer = ''; 
                if (cmd) { if (!_history.length || _history[_history.length - 1] !== cmd) _history.push(cmd); }
                _historyIndex = _history.length; _eventCallback({ type: 'commandReady', command: cmd }); break;
            case 'Backspace':
                domEvent.preventDefault(); if (_buffer) { _buffer = _buffer.slice(0, -1); _eventCallback({ type: 'bufferUpdate', buffer: _buffer }); if (_historyIndex < _history.length) _historyIndex = _history.length; } break;
            case 'ArrowUp':
                domEvent.preventDefault(); if (_history.length) { if (_historyIndex > 0) _historyIndex--; _buffer = _history[_historyIndex] || ""; _eventCallback({ type: 'historyNav', buffer: _buffer }); } break;
            case 'ArrowDown':
                domEvent.preventDefault(); if (_history.length > 0) { // Allow going past last item to empty buffer
                    if (_historyIndex < _history.length - 1) { _historyIndex++; _buffer = _history[_historyIndex]; } 
                    else { _historyIndex = _history.length; _buffer = ''; } 
                    _eventCallback({ type: 'historyNav', buffer: _buffer }); 
                } else if (_historyIndex === -1 && _history.length === 0) { /* Do nothing if no history */ }
                break;
            case 'Tab': domEvent.preventDefault(); _eventCallback({ type: 'tabPressed', buffer: _buffer, domEvent }); break;
            case 'Control': case 'Shift': case 'Alt': case 'Meta': 
            case 'ArrowLeft': case 'ArrowRight': case 'Home': case 'End': 
            case 'Delete': case 'Insert': case 'Escape': 
            case 'F1': case 'F2': case 'F3': case 'F4': case 'F5': case 'F6':
            case 'F7': case 'F8': case 'F9': case 'F10': case 'F11': case 'F12':
            case 'PageUp': case 'PageDown': case 'PrintScreen': case 'ScrollLock': case 'Pause':
                break; 
            default:
                if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') { domEvent.preventDefault(); _buffer = ''; _historyIndex = _history.length; _eventCallback({ type: 'interrupt' }); }
                else if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') { domEvent.preventDefault(); _eventCallback({ type: 'commandReady', command: 'clear' }); }
                else if (printable) { if (_buffer.length < 1000) { _buffer += key; _eventCallback({ type: 'bufferUpdate', buffer: _buffer }); if (_historyIndex < _history.length) _historyIndex = _history.length; } }
                break;
        }
    });
}
export function updatePromptString(s) { _currentPromptString = s; } export function setBuffer(s) { _buffer = s; }
export function getBuffer() { return _buffer; } export function getPromptString() { return _currentPromptString; }
export function enableInput() { _inputEnabled = true; } export function disableInput() { _inputEnabled = false; }
export function waitForEnter(cb) { _waitForEnterCallback = cb; disableInput(); _buffer = ''; }