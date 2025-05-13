// output.js
let _term = null;
export function initOutput(termInstance) { _term = termInstance; }
export function displayOutput(text, speed, callback) {
    if (!_term) { if (callback) callback(); return () => {}; }
    const normalizedText = String(text == null ? "" : text).replace(/\r\n?/g, '\n'); // Ensure text is string, handle null/undefined
    let i = 0; let typingTimeout = null; let isCancelled = false;
    const typeChar = () => {
        if (isCancelled) {
            if (i < normalizedText.length) _term.write(normalizedText.substring(i).replace(/\n/g, '\r\n')); 
            if (callback) callback(); return;
        }
        if (i < normalizedText.length) {
            const char = normalizedText[i];
            if (char === '\n') _term.write('\r\n'); else _term.write(char);
            i++;
            if (speed > 0) typingTimeout = setTimeout(typeChar, speed);
            else Promise.resolve().then(typeChar); 
        } else if (callback) callback();
    };

    if (speed <= 0) { // Handle speed 0 directly without starting char-by-char typing if not cancelled
        if (!isCancelled) {
            _term.write(normalizedText.replace(/\n/g, '\r\n'));
            if (callback) callback();
        }
        return () => { isCancelled = true; }; // Still provide a way to "cancel" even if it was instant
    }
    
    if (!isCancelled) typeChar(); // Start animation only if not already cancelled and speed > 0
    
    return () => { isCancelled = true; clearTimeout(typingTimeout); };
}
export function prompt(promptString) { if (!_term) return; _term.write(String(promptString == null ? "" : promptString).replace(/\n/g, '\r\n')); }
export function clearCurrentLine() { if (!_term) return; _term.write('\r\u001b[K'); }