// ui.js
const menuContainer = document.getElementById('menu-container');
const terminalContainer = document.getElementById('terminal-container');
const levelTitleElement = document.getElementById('level-title');
const levelDescriptionElement = document.getElementById('level-description');
const objectivesListElement = document.getElementById('objectives-list');
const hintsListElement = document.getElementById('hints-list');

export function showMenu() {
    if (menuContainer) menuContainer.classList.remove('hidden');
    if (terminalContainer) terminalContainer.classList.add('hidden');
}
export function showTerminal() {
    if (menuContainer) menuContainer.classList.add('hidden');
    if (terminalContainer) terminalContainer.classList.remove('hidden');
}
export function setLevelInfo(title, description) {
    if (levelTitleElement) levelTitleElement.textContent = title || "N/A";
    if (levelDescriptionElement) levelDescriptionElement.textContent = description || "Aucune description.";
}
export function setObjectives(objectives = []) {
    if (!objectivesListElement) return; 
    objectivesListElement.innerHTML = ''; 
    if (!Array.isArray(objectives)) return;
    objectives.forEach(obj => { 
        const li = document.createElement('li'); 
        li.textContent = obj.description; 
        li.dataset.objectiveId = obj.id; 
        objectivesListElement.appendChild(li); 
    });
}
export function markObjectiveCompleted(objectiveId) {
    if (!objectivesListElement) return;
    const item = objectivesListElement.querySelector(`li[data-objective-id="${objectiveId}"]`); 
    if (item) item.classList.add('completed');
}
export function setHints(hints = []) {
    if (!hintsListElement) return; 
    hintsListElement.innerHTML = ''; 
    const defaultHelp = document.createElement('li'); 
    defaultHelp.textContent = "Utilisez 'help' pour voir les commandes disponibles."; 
    hintsListElement.appendChild(defaultHelp);
    if (!Array.isArray(hints)) return;
    hints.forEach(hintText => { 
        const li = document.createElement('li'); 
        li.textContent = hintText; 
        hintsListElement.appendChild(li); 
    });
}
export { terminalContainer }; // Export if needed by other modules directly