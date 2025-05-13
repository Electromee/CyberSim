// input.js
let _term = null, 
    _currentPromptString = '$ ', 
    _history = [], 
    _historyIndex = -1, 
    _buffer = '', 
    _cursorPos = 0, // NEW: Tracks cursor position within the buffer
    _eventCallback = null, 
    _inputEnabled = false, 
    _waitForEnterCallback = null;

export function initInput(termInstance, eventCallback) {
    if (_term) { console.warn('Input init multiple times.'); return; }
    _term = termInstance; 
    _eventCallback = eventCallback; 
    _inputEnabled = true; 
    _cursorPos = 0; // Initialize cursor position

    _term.onKey(({ key, domEvent }) => {
        if (!_eventCallback) return;

        if (!_inputEnabled) {
             if (domEvent.key === 'Enter' && _waitForEnterCallback) {
                  domEvent.preventDefault(); 
                  const cb = _waitForEnterCallback; 
                  _waitForEnterCallback = null; 
                  cb(); 
             }
             return; 
        }

        const isCtrl = domEvent.ctrlKey;
        const isAlt = domEvent.altKey; // Though Alt combinations are not heavily used yet
        const isMeta = domEvent.metaKey; // For MacOS Command key, often treated like Ctrl

        // Prioritize specific control combinations
        if (isCtrl) {
            switch (domEvent.key.toLowerCase()) {
                case 'a': // Ctrl+A (Home)
                    domEvent.preventDefault();
                    _cursorPos = 0;
                    _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                    return;
                case 'e': // Ctrl+E (End)
                    domEvent.preventDefault();
                    _cursorPos = _buffer.length;
                    _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                    return;
                case 'c': // Ctrl+C (Interrupt)
                    domEvent.preventDefault();
                    _buffer = '';
                    _cursorPos = 0;
                    _historyIndex = _history.length;
                    _eventCallback({ type: 'interrupt' });
                    return;
                case 'l': // Ctrl+L (Clear command)
                    domEvent.preventDefault();
                    _eventCallback({ type: 'commandReady', command: 'clear' });
                    return;
                case 'u': // Ctrl+U (Delete from cursor to start)
                    domEvent.preventDefault();
                    if (_cursorPos > 0) {
                        _buffer = _buffer.substring(_cursorPos);
                        _cursorPos = 0;
                        _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                    }
                    return;
                case 'k': // Ctrl+K (Delete from cursor to end)
                    domEvent.preventDefault();
                    if (_cursorPos < _buffer.length) {
                        _buffer = _buffer.substring(0, _cursorPos);
                        _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                    }
                    return;
                // Add Ctrl+W (delete word backward) in future if desired
            }
        }
        
        // Handle other keys
        switch (domEvent.key) {
            case 'Enter':
                domEvent.preventDefault();
                const cmd = _buffer.trim();
                _buffer = '';
                _cursorPos = 0;
                if (cmd) {
                    if (!_history.length || _history[_history.length - 1] !== cmd) {
                        _history.push(cmd);
                    }
                }
                _historyIndex = _history.length;
                _eventCallback({ type: 'commandReady', command: cmd });
                break;

            case 'Backspace':
                domEvent.preventDefault();
                if (_cursorPos > 0) {
                    _buffer = _buffer.substring(0, _cursorPos - 1) + _buffer.substring(_cursorPos);
                    _cursorPos--;
                    _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                    if (_historyIndex < _history.length) _historyIndex = _history.length; // Detach from history
                }
                break;

            case 'Delete': // Added Delete key functionality
                domEvent.preventDefault();
                if (_cursorPos < _buffer.length) {
                    _buffer = _buffer.substring(0, _cursorPos) + _buffer.substring(_cursorPos + 1);
                    _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                    if (_historyIndex < _history.length) _historyIndex = _history.length; // Detach from history
                }
                break;

            case 'ArrowUp':
                domEvent.preventDefault();
                if (_history.length) {
                    if (_historyIndex > 0) _historyIndex--;
                    _buffer = _history[_historyIndex] || "";
                    _cursorPos = _buffer.length; // Move cursor to end of history item
                    _eventCallback({ type: 'historyNav', buffer: _buffer, cursorPos: _cursorPos });
                }
                break;

            case 'ArrowDown':
                domEvent.preventDefault();
                if (_history.length > 0) {
                    if (_historyIndex < _history.length - 1) {
                        _historyIndex++;
                        _buffer = _history[_historyIndex];
                    } else {
                        _historyIndex = _history.length;
                        _buffer = '';
                    }
                    _cursorPos = _buffer.length; // Move cursor to end
                    _eventCallback({ type: 'historyNav', buffer: _buffer, cursorPos: _cursorPos });
                }
                break;

            case 'ArrowLeft':
                domEvent.preventDefault();
                if (_cursorPos > 0) {
                    _cursorPos--;
                    _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos }); // No actual buffer change, just cursor
                }
                break;

            case 'ArrowRight':
                domEvent.preventDefault();
                if (_cursorPos < _buffer.length) {
                    _cursorPos++;
                    _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos }); // No actual buffer change, just cursor
                }
                break;
            
            case 'Home':
                domEvent.preventDefault();
                _cursorPos = 0;
                _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                break;

            case 'End':
                domEvent.preventDefault();
                _cursorPos = _buffer.length;
                _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                break;

            case 'Tab':
                domEvent.preventDefault();
                _eventCallback({ type: 'tabPressed', buffer: _buffer, cursorPos: _cursorPos, domEvent });
                break;

            // Keys to explicitly ignore or that have no default action here
            case 'Control': case 'Shift': case 'Alt': case 'Meta':
            case 'CapsLock': case 'NumLock': case 'ScrollLock':
            case 'Escape': // Escape could be used for other things later (e.g., clearing buffer)
            case 'Insert': // Typically toggles insert/overwrite, we are always in insert
            case 'F1': case 'F2': case 'F3': case 'F4': case 'F5': case 'F6':
            case 'F7': case 'F8': case 'F9': case 'F10': case 'F11': case 'F12':
            case 'PageUp': case 'PageDown': case 'PrintScreen': case 'Pause':
                // No action for these keys in this context
                break;

            default:
                // Check for printable characters (simplified, Xterm.js `key` gives the char)
                // domEvent.key.length === 1 is a common check for printable.
                // We also need to ensure it's not a control character if it's length 1 (e.g. some special function keys might report length 1)
                // And ensure no modifiers like Ctrl/Alt are pressed (already handled for specific combos like Ctrl+C)
                const printable = !isCtrl && !isAlt && !isMeta && 
                                  domEvent.key.length === 1 && // Most direct way to check for a single character
                                  domEvent.keyCode !== 229 && // IME composition
                                  !(domEvent.keyCode >= 16 && domEvent.keyCode <= 20) && // Modifier keys themselves
                                  domEvent.keyCode !== 27 && // Escape
                                  domEvent.keyCode !== 9 && // Tab (already handled)
                                  domEvent.keyCode !== 13; // Enter (already handled)


                if (printable) {
                    if (_buffer.length < 1000) { // Buffer limit
                        const before = _buffer.substring(0, _cursorPos);
                        const after = _buffer.substring(_cursorPos);
                        _buffer = before + key + after; // Insert character from Xterm.js
                        _cursorPos++;
                        _eventCallback({ type: 'bufferUpdate', buffer: _buffer, cursorPos: _cursorPos });
                        if (_historyIndex < _history.length) _historyIndex = _history.length; // Detach from history
                    }
                }
                break;
        }
    });
}

export function updatePromptString(s) { _currentPromptString = s; }
export function setBuffer(s) { 
    _buffer = String(s); // Ensure it's a string
    _cursorPos = _buffer.length; // After setting buffer (e.g. tab complete), cursor to end
}
export function getBuffer() { return _buffer; }
export function getPromptString() { return _currentPromptString; }
export function getCursorPos() { return _cursorPos; } // NEW getter

export function enableInput() { _inputEnabled = true; }
export function disableInput() { _inputEnabled = false; }

export function waitForEnter(cb) { 
    _waitForEnterCallback = cb; 
    disableInput(); 
    _buffer = ''; 
    _cursorPos = 0;
}