// Fichier : sim-engine.js (Web Worker)

let simulatedState = {
    fileSystem: { name: '', type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', children: [] },
    session: { user: 'user', host: 'local', cwd: [''], filesRead: [], home: ['home', 'user'], groups: ['users'] },
    networkState: { 
        hosts: {
            'local': { ips: ['127.0.0.1', '192.168.1.10'], openPorts: [], mac: '00:1A:2B:3C:4D:5E' },
            'target.com': { 
                ips: ['192.168.1.100', '10.0.0.5'], 
                domainNames: ['target.com', 'www.target.com'], 
                openPorts: [
                    { port: 80, service: 'http', banner: 'Apache/2.4' }, 
                    { port: 22, service: 'ssh', banner: 'OpenSSH_7.6p1' },
                    { port: 443, service: 'https', banner: 'Apache/2.4 OpenSSL'}
                ],
                mac: '00:AA:BB:CC:DD:EE'
            },
            'another-server.local': { 
                ips: ['192.168.1.200'], 
                domainNames: ['another-server.local', 'dev.another-server.local'],
                openPorts: [{ port: 22, service: 'ssh', banner:'OpenSSH_8.0' }, {port: 8080, service:'http-alt', banner:'Tomcat Dev'}],
                mac: '11:22:33:44:55:66'
            },
            'dns.google': { ips: ['8.8.8.8'], domainNames: ['dns.google'] },
            'resolver1.opendns.com': { ips: ['208.67.222.222'], domainNames: ['resolver1.opendns.com']}
        },
        defaultGateway: '192.168.1.1', 
        dnsServers: ['8.8.8.8', '1.1.1.1'] 
    },
    simulatedProcesses: [], 
    simulatedServices: {},
    simulatedArchives: {},
    currentLevel: null,
    objectivesCompleted: [],
};

const commandDefinitions = {
    help: { description: "Affiche l'aide générale ou l'aide d'une commande spécifique.", usage: "help [commande]" },
    pwd: { description: "Affiche le chemin du répertoire de travail courant.", usage: "pwd" },
    ls: { description: "Liste le contenu d'un répertoire.", usage: "ls [options] [chemin]", options: [{ flag: "-a, --all", description: "Ne pas ignorer les entrées commençant par ." },{ flag: "-l", description: "Utiliser le format d'affichage long." },{ flag: "-h", description: "Afficher les tailles lisibles (avec -l)." }] },
    cd: { description: "Change le répertoire de travail courant.", usage: "cd [répertoire]" },
    cat: { description: "Concatène et affiche le contenu de fichiers.", usage: "cat [fichier...]" },
    grep: { description: "Chercher un modèle dans des fichiers.", usage: "grep [options] modèle fichier...", options: [{ flag: "-i", description: "Ignorer la casse." },{ flag: "-v", description: "Inverser la correspondance." }, { flag: "-n", description: "Afficher les numéros de ligne."}] },
    mkdir: { description: "Crée un répertoire.", usage: "mkdir [options] nom_dossier...", options: [{flag: "-p", description: "Créer les répertoires parents si besoin."}] },
    rm: { description: "Supprime des fichiers ou répertoires.", usage: "rm [options] fichier/dossier...", options: [{flag: "-r, -R", description: "Supprimer récursivement."}, {flag: "-f, --force", description: "Forcer la suppression."}] },
    cp: { description: "Copie des fichiers ou répertoires.", usage: "cp [options] source destination", options: [{flag: "-r, -R", description: "Copier récursivement."}] },
    mv: { description: "Déplace ou renomme des fichiers ou répertoires.", usage: "mv [options] source destination" },
    touch: { description: "Crée un fichier vide ou met à jour son horodatage.", usage: "touch fichier..." },
    echo: { description: "Affiche une ligne de texte.", usage: "echo [texte...]" },
    head: { description: "Affiche les premières lignes d'un fichier.", usage: "head [options] [fichier...]", options: [{flag: "-n LIGNES", description: "Afficher les N premières lignes (défaut 10)."}] },
    tail: { description: "Affiche les dernières lignes d'un fichier.", usage: "tail [options] [fichier...]", options: [{flag: "-n LIGNES", description: "Afficher les N dernières lignes (défaut 10)."}] },
    chmod: { description: "Change les permissions d'un fichier/dossier.", usage: "chmod MODE fichier/dossier" , options: [{flag: "MODE", description: "Ex: 755, u+x (symbolique partiel)"}]},
    chown: { description: "Change le propriétaire et/ou groupe.", usage: "chown [UTILISATEUR][:GROUPE] fichier/dossier" },
    whoami: { description: "Affiche le nom de l'utilisateur courant.", usage: "whoami" },
    id: { description: "Affiche les informations UID, GID et groupes.", usage: "id [utilisateur]" },
    man: { description: "Affiche la page de manuel d'une commande.", usage: "man commande"},
    find: { description: "Recherche fichiers/dossiers.", usage: "find [chemin] [expression]", options:[{flag:"-name MOTIF", description:"Nom."}, {flag:"-type [f|d]", description:"Type."}, {flag:"-size [+|-]N[c|k|M|G]", description:"Taille (simul.)"}]},
    ps: { description: "Affiche processus.", usage: "ps [options]", options:[{flag:"aux, -ef", description:"Formats courants."}]},
    kill: { description: "Termine processus.", usage: "kill [options] PID...", options:[{flag:"-9", description:"Forcer (SIGKILL)."}]},
    systemctl: { description: "Contrôle systemd.", usage: "systemctl [CMD] SERVICE", options:[{flag:"status,start,stop", description:"Actions."}]},
    tar: { description: "Archive (simulé pour -xzf).", usage: "tar [options] [archive] [fichiers...]", options:[{flag:"-xzf ARCHIVE", description:"Extraire .tar.gz"},{flag:"-cvf ARCHIVE files...", description:"Créer archive (non impl.)"}]},
    unzip: { description: "Décompresse ZIP (simulé).", usage: "unzip ARCHIVE.zip [-d DEST]" },
    clear: { description: "Efface l'écran.", usage: "clear" },
    menu: { description: "Menu principal.", usage: "menu" },
    resetLevel: { description: "Redémarre mission.", usage: "resetLevel" },
    ping: { description: "Teste connectivité.", usage: "ping [opts] dest", options: [{flag: "-c N", description:"N paquets."}]},
    ssh: { description: "Client Secure Shell.", usage: "ssh [user@]host [cmd]" },
    scp: { description: "Copie sécurisée (simulée).", usage: "scp [opts] src dest" },
    wget: { description: "Récupère fichiers Web.", usage: "wget [opts] [URL]", options: [{flag: "-O FILE", description: "Sauvegarder."}] },
    curl: { description: "Transfère données.", usage: "curl [opts] [URL]" },
    hostname: { description: "Nom d'hôte.", usage: "hostname" },
    ifconfig: { description: "Interfaces réseau (obsolète).", usage: "ifconfig [iface]" },
    ip: { description: "Interfaces/routage.", usage: "ip [opts] OBJ {CMD}", options:[{flag:"addr", description:"Adresses."},{flag:"route", description:"Routage."}] },
    netstat: { description: "Connexions/routage.", usage: "netstat [opts]", options:[{flag:"-rn", description:"Routage."},{flag:"-tulnp", description:"Sockets (simul)."}]},
    traceroute: { description: "Route des paquets.", usage: "traceroute [opts] host" },
    nslookup: { description: "Interroge DNS.", usage: "nslookup host [server]" },
    dig: { description: "Recherche DNS.", usage: "dig [@srv] name [type]" },
    nmap: { description: "Scan réseau/ports.", usage: "nmap [scan type] [options] {cible}", options: [{flag:"-p PORTS", description:"Ports à scanner (ex: 22,80,443)."},{flag:"-sV", description:"Sonde les ports ouverts pour déterminer service/version info."}]}
};

function simpleIndent(text, indentLevel = 1) {
    return '    '.repeat(indentLevel) + text;
}

function wrapText(text, maxWidth) {
    if (maxWidth <= 0 || !text || text.length <= maxWidth) return text ? [text] : [""];
    const words = text.split(' ');
    const lines = []; let currentLine = "";
    for (const word of words) {
        if (word.length > maxWidth && currentLine.length > 0) { lines.push(currentLine); currentLine = ""; }
        if (word.length > maxWidth) { lines.push(word); continue; }
        if (currentLine.length === 0) currentLine = word;
        else if (currentLine.length + 1 + word.length <= maxWidth) currentLine += " " + word;
        else { lines.push(currentLine); currentLine = word; }
    }
    if (currentLine.length > 0) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
}

self.onmessage = async ({ data }) => {
    console.log('Worker received:', data.type, data);
    switch (data.type) {
        case 'loadLevel':
            await loadLevel(data.levelId);
            if (simulatedState.currentLevel) {
                const objectivesForUI = (simulatedState.currentLevel.objectives || []).map(obj => ({ id: obj.id, description: obj.description }));
                self.postMessage({
                    type: 'levelLoaded', levelId: simulatedState.currentLevel.id, levelName: simulatedState.currentLevel.name,
                    description: simulatedState.currentLevel.description, objectives: objectivesForUI, hints: simulatedState.currentLevel.hints || [],
                    newPrompt: buildPromptString(simulatedState.session), simulatedCwd: [...simulatedState.session.cwd]
                });
            } else { 
                self.postMessage({ type: 'output', output: `Erreur Critique: Impossible de charger la configuration du niveau "${data.levelId}". Vérifiez la console du worker.\n`, speed: 0, newPrompt: '$ ', simulatedCwd: [''] });
            }
            break;
        case 'command':
            const result = runCommand(data.command);
            self.postMessage({ type: 'output', output: result.output, speed: result.speed, newPrompt: buildPromptString(simulatedState.session), simulatedCwd: [...simulatedState.session.cwd] });
            const baseCmd = data.command.trim().split(/\s+/)[0];
            const clientCmds = ['clear', 'menu', 'resetLevel']; 
            if (simulatedState.currentLevel && !clientCmds.includes(baseCmd)) {
                checkLevelObjectives(result.output); // MODIFIED: Pass command output
            }
            break;
        case 'getCompletionCandidates':
            self.postMessage({ type: 'completionCandidates', buffer: data.buffer, candidates: getCompletionCandidates(data.buffer, data.cwd || simulatedState.session.cwd) });
            break;
        case 'resetLevel':
            if (simulatedState.currentLevel) {
                await loadLevel(simulatedState.currentLevel.id);
                self.postMessage({ type: 'output', output: 'Niveau réinitialisé.\n', speed: 0, newPrompt: buildPromptString(simulatedState.session), simulatedCwd: [...simulatedState.session.cwd] });
                // After reset, also check objectives in case initial state fulfills some
                checkLevelObjectives(); // Check objectives on reset
            } else { self.postMessage({ type: 'output', output: 'Aucun niveau à réinitialiser.\n', speed: 0, newPrompt: '$ ', simulatedCwd: [''] }); }
            break;
        default: console.warn('Worker: Unhandled type', data.type, data);
    }
};

async function loadLevel(levelId) {
    simulatedState.currentLevel = null;
    try {
        const levelModule = await import(`./missions_linux/${levelId}.js`);
        const cfg = levelModule.levelConfig;

        if (!cfg || !cfg.initialState || !cfg.initialState.fileSystem || !cfg.initialState.session) {
            console.error(`Level config for "${levelId}" is invalid or missing critical initialState properties.`);
            simulatedState.currentLevel = null; 
            return;
        }

        simulatedState.fileSystem = JSON.parse(JSON.stringify(cfg.initialState.fileSystem));
        simulatedState.fileSystem.owner = simulatedState.fileSystem.owner || 'root';
        simulatedState.fileSystem.group = simulatedState.fileSystem.group || 'root';
        simulatedState.fileSystem.permissions = simulatedState.fileSystem.permissions || 'drwxr-xr-x';

        simulatedState.session = JSON.parse(JSON.stringify(cfg.initialState.session));
        
        simulatedState.currentLevel = cfg;
        simulatedState.objectivesCompleted = [];
        simulatedState.session.filesRead = []; 
        
        simulatedState.networkState = JSON.parse(JSON.stringify(cfg.initialState.networkState || { hosts: {} , defaultGateway: '192.168.1.1', dnsServers: ['8.8.8.8']}));
        simulatedState.simulatedProcesses = JSON.parse(JSON.stringify(cfg.initialState.simulatedProcesses || []));
        simulatedState.simulatedServices = JSON.parse(JSON.stringify(cfg.initialState.simulatedServices || {}));
        simulatedState.simulatedArchives = JSON.parse(JSON.stringify(cfg.initialState.simulatedArchives || {}));
        
        const defaultUser = simulatedState.session.user || 'user';
        simulatedState.session.home = simulatedState.session.home || ['home', defaultUser];
        simulatedState.session.groups = simulatedState.session.groups || [defaultUser === 'root' ? 'root' : defaultUser, 'users'];
        
        console.log(`Level "${levelId}" loaded successfully.`);
        // Check objectives after loading, in case initial state fulfills some
        checkLevelObjectives();

    } catch (error) { 
        console.error(`Failed to load level "${levelId}":`, error);
        simulatedState.currentLevel = null;
    }
}

// MODIFIED: Added lastCommandOutput parameter with a default value
function checkLevelObjectives(lastCommandOutput = null) { 
    if (!simulatedState.currentLevel || !Array.isArray(simulatedState.currentLevel.objectives)) return;
    simulatedState.currentLevel.objectives.forEach(obj => {
        if (!obj || typeof obj.check !== 'function') { console.warn("Invalid objective found in level config:", obj); return; }
        if (!simulatedState.objectivesCompleted.includes(obj.id)) {
            try {
                // MODIFIED: Pass lastCommandOutput to the check function
                if (obj.check(JSON.parse(JSON.stringify(simulatedState)), lastCommandOutput)) { 
                    simulatedState.objectivesCompleted.push(obj.id);
                    self.postMessage({ type: 'objectiveComplete', objectiveId: obj.id, message: obj.message || 'Objectif atteint !' });
                    checkIfLevelComplete();
                }
            } catch (e) { console.error(`Error checking objective ${obj.id} for level ${simulatedState.currentLevel.id}:`, e); }
        }
    });
}

function checkIfLevelComplete() { 
    if (!simulatedState.currentLevel) return;
    const { objectives, winCondition, name: levelName, id: levelId } = simulatedState.currentLevel;
    
    const allObjectivesActuallyInLevel = Array.isArray(objectives) && objectives.length > 0;
    const allObjectivesMetByPlayer = allObjectivesActuallyInLevel && 
                                     simulatedState.objectivesCompleted.length === objectives.length &&
                                     objectives.every(obj => simulatedState.objectivesCompleted.includes(obj.id));
    
    let winCondMet = false;
    if (!Array.isArray(winCondition) || winCondition.length === 0) {
        winCondMet = allObjectivesMetByPlayer;
    } else {
        winCondMet = winCondition.every(id => simulatedState.objectivesCompleted.includes(id));
    }
    
    if (winCondMet && ( (Array.isArray(winCondition) && winCondition.length > 0) || allObjectivesMetByPlayer) ) { 
        self.postMessage({ type: 'levelComplete', levelId, message: `Félicitations ! Mission "${levelName}" accomplie.` });
    }
}

function resolvePath(currentDirArray, targetPathStr) {
    if (!Array.isArray(currentDirArray)) currentDirArray = ['']; 
    if (typeof targetPathStr !== 'string' || targetPathStr.trim() === "") targetPathStr = '.'; 
    if (targetPathStr === '~') return [...(simulatedState.session.home || ['home', simulatedState.session.user || 'user'])];
    
    let resolved = targetPathStr.startsWith('/') ? [] : [...currentDirArray.filter(p => p)];
    const parts = targetPathStr.split('/').filter(p => p && p !== '.');

    for (const part of parts) {
        if (part === '..') { 
            if (resolved.length > 0) resolved.pop();
        } else {
            resolved.push(part);
        }
    }
    return resolved.length === 0 ? [''] : resolved;
}

function findNode(fsRoot, pathArray) {
    let currentNode = fsRoot;
    if (!Array.isArray(pathArray) || pathArray.length === 0 || (pathArray.length === 1 && pathArray[0] === '')) {
        return fsRoot; 
    }
    
    const searchParts = pathArray[0] === '' ? pathArray.slice(1).filter(p => p) : pathArray.filter(p => p);

    if (searchParts.length === 0 && pathArray[0] === '') return fsRoot;

    for (const part of searchParts) {
        if (!currentNode || currentNode.type !== 'directory' || !Array.isArray(currentNode.children)) {
            return null;
        }
        const nextNode = currentNode.children.find(child => child.name === part);
        if (!nextNode) return null;
        currentNode = nextNode;
    }
    return currentNode;
}

function checkPermissions(user, node, action) {
    if (!node) return false; 
    if (user === 'root') return true;

    const perms = node.permissions || "----------"; 
    if (perms.length !== 10) { console.warn(`Invalid permissions string for ${node.name}: ${perms}`); return false; }

    let relevantSet;
    const nodeOwner = node.owner || 'root'; 
    const nodeGroup = node.group || 'root';
    const userGroups = simulatedState.session.groups || [];

    if (nodeOwner === user) {
        relevantSet = perms.substring(1, 4);
    } else if (userGroups.includes(nodeGroup)) {
        relevantSet = perms.substring(4, 7);
    } else {
        relevantSet = perms.substring(7, 10);
    }

    switch (action) {
        case 'read': return relevantSet[0] === 'r';
        case 'write': return relevantSet[1] === 'w';
        case 'execute': return relevantSet[2] === 'x';
        default: return false;
    }
}

function buildPromptString(session) {
    if (!session || !session.cwd) return '$ ';
    const pathParts = (session.cwd[0] === '' && session.cwd.length > 1) ? session.cwd.slice(1) : session.cwd;
    let displayPath = '/' + pathParts.filter(p => p).join('/');
    if (displayPath === "/" && pathParts.length > 0 && pathParts.filter(p=>p).length > 0 && pathParts[0] !== '') {
        displayPath = '/' + pathParts.filter(p => p).join('/');
    } else if (displayPath === "/" && pathParts.length === 0 ) {
         displayPath = "/";
    } else if (displayPath === "" && pathParts.length === 1 && pathParts[0] === "") {
        displayPath = "/";
    }
    const symbol = (session.user === 'root') ? '#' : '$';
    return `${session.user || 'user'}@${session.host || 'local'}:${displayPath}${symbol}`;
}

const findHostInNetwork = (identifier) => { 
    if (!simulatedState.networkState || !simulatedState.networkState.hosts) return null;
    for (const hostKey in simulatedState.networkState.hosts) {
        const hostData = simulatedState.networkState.hosts[hostKey];
        if (hostKey === identifier) return {name: hostKey, ...hostData};
        if (hostData.ips && hostData.ips.includes(identifier)) return {name: hostKey, ...hostData};
        if (hostData.domainNames && hostData.domainNames.includes(identifier)) return {name: hostKey, ...hostData};
    } return null;
};

function runCommand(cmdStr) {
    const parts = cmdStr.trim().split(/\s+/);
    const baseCmd = parts[0];
    let args = parts.slice(1);
    let output = "";
    const speed = 0;

    if (!baseCmd) return { output, speed };
    const cmdDef = commandDefinitions[baseCmd];

    if (args.includes('--help')) { // Simplified help check for any command
        if (cmdDef) {
            output = `Usage: ${cmdDef.usage}\n${cmdDef.description}\n`;
            if (cmdDef.options && Array.isArray(cmdDef.options)) {
                output += 'Options:\n';
                cmdDef.options.forEach(o => { output += `  ${o.flag}\n${simpleIndent(o.description,1)}\n`; });
            }
            return { output, speed };
        } else {
            // If --help on a non-defined command, could fall through to "command not found" or show generic help
        }
    }
    
    switch (baseCmd) {
        case 'help':
            if (args.length > 0 && commandDefinitions[args[0]]) {
                 // Use the --help logic from above by re-crafting the call
                 const helpCmdDef = commandDefinitions[args[0]];
                 output = `Usage: ${helpCmdDef.usage}\n${helpCmdDef.description}\n`;
                 if (helpCmdDef.options && Array.isArray(helpCmdDef.options)) {
                     output += 'Options:\n';
                     helpCmdDef.options.forEach(o => { output += `  ${o.flag}\n${simpleIndent(o.description,1)}\n`; });
                 }
                 return { output, speed };
            }
            output = 'Commands available (simulated):\n';
            const cmdNames = Object.keys(commandDefinitions);
            let maxLen = 0; cmdNames.forEach(n => { if (n.length > maxLen) maxLen = n.length; });
            const colWidth = maxLen + 4; const termWidthEst = 80;
            const descIndent = ' '.repeat(colWidth);
            const descMaxWidth = Math.max(20, termWidthEst - colWidth);
            cmdNames.sort().forEach(name => {
                const def = commandDefinitions[name];
                const cmdPart = name.padEnd(colWidth, ' ');
                if (!def.description) { output += `${cmdPart}\n`; return; }
                const wrapped = wrapText(def.description, descMaxWidth);
                if (wrapped.length > 0 && wrapped[0]) {
                    output += `${cmdPart}${wrapped[0]}\n`;
                    for (let k = 1; k < wrapped.length; k++) output += `${descIndent}${wrapped[k]}\n`;
                } else output += `${cmdPart}\n`;
            });
            output += '\nNote: This is a simulation. Type \'[commande] --help\' for specific command help.\n';
            break;
        case 'pwd':
            let currentPathPartsPwd = simulatedState.session.cwd || [''];
            if (currentPathPartsPwd.length === 1 && currentPathPartsPwd[0] === '') output = '/\n';
            else output = '/' + currentPathPartsPwd.filter(p => p).join('/') + '\n';
            break;
        case 'ls':
            const pathArgRawLs = args.find(arg => !arg.startsWith('-'));
            const targetPathStrLs = pathArgRawLs || '.';
            const resolvedLsPathArray = resolvePath(simulatedState.session.cwd, targetPathStrLs);
            let nodeToList = findNode(simulatedState.fileSystem, resolvedLsPathArray);
            if (!nodeToList) { output = `ls: cannot access '${targetPathStrLs}': No such file or directory\n`; break; }
            const showHidden = args.includes('-a') || args.includes('--all');
            const longFormat = args.includes('-l');
            const humanReadable = args.includes('-h') && longFormat;
            let itemsToDisplay = [];
            if (nodeToList.type === 'directory') {
                if (!checkPermissions(simulatedState.session.user, nodeToList, 'execute')) { output = `ls: cannot open directory '${targetPathStrLs}': Permission denied (no execute)\n`; break; }
                if (!checkPermissions(simulatedState.session.user, nodeToList, 'read')) { output = `ls: cannot open directory '${targetPathStrLs}': Permission denied (no read names)\n`; break; }
                itemsToDisplay = nodeToList.children ? [...nodeToList.children] : [];
                if (!showHidden) itemsToDisplay = itemsToDisplay.filter(item => !item.name.startsWith('.'));
            } else {
                if (!checkPermissions(simulatedState.session.user, nodeToList, 'read')) { output = `ls: cannot access '${targetPathStrLs}': Permission denied\n`; break; }
                itemsToDisplay = [nodeToList];
            }
            itemsToDisplay.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            if (longFormat) {
                let totalBlocks = 0;
                const lines = itemsToDisplay.map(item => {
                    const perms = item.permissions || (item.type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--');
                    const links = item.type === 'directory' ? (item.children ? item.children.length + 2 : 2) : 1;
                    const owner = item.owner || 'unknown'; const group = item.group || 'unknown';
                    let size = (item.type === 'file') ? (item.content ? item.content.length : 0) : 4096;
                    totalBlocks += Math.ceil(size / 512);
                    const date = "Jan 01 00:00"; 
                    let nameDisplay = item.name;
                    if (item.type === 'directory') nameDisplay = `\x1b[1;34m${item.name}\x1b[0m`;
                    else if (perms.includes('x')) nameDisplay = `\x1b[1;32m${item.name}\x1b[0m`;
                    let sizeDisplay = String(size);
                    if (humanReadable) {
                        if (size >= 1024*1024*1024) sizeDisplay = (size / (1024*1024*1024)).toFixed(1) + 'G';
                        else if (size >= 1024*1024) sizeDisplay = (size / (1024*1024)).toFixed(1) + 'M';
                        else if (size >= 1024) sizeDisplay = (size / 1024).toFixed(1) + 'K';
                        else sizeDisplay = String(size) + 'B';
                    }
                    return `${perms} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${sizeDisplay.padStart(6)} ${date} ${nameDisplay}`;
                });
                if (nodeToList.type === 'directory' && itemsToDisplay.length > 0) output += `total ${totalBlocks}\n`;
                output += lines.join('\n') + (lines.length > 0 ? '\n' : '');
            } else {
                const permsCharCheck = (p, i, char) => p && p.length > i && p[i] === char;
                const names = itemsToDisplay.map(item => {
                    if (item.type === 'directory') return `\x1b[1;34m${item.name}\x1b[0m`;
                    if (item.permissions && (permsCharCheck(item.permissions,3,'x') || permsCharCheck(item.permissions,6,'x') || permsCharCheck(item.permissions,9,'x'))) return `\x1b[1;32m${item.name}\x1b[0m`;
                    return item.name;
                });
                output = names.join('  ') + (names.length > 0 ? '\n' : '');
            }
            break;
        case 'cd':
            const targetCdPathStr = args[0] || '~';
            const resolvedCdPathArray = resolvePath(simulatedState.session.cwd, targetCdPathStr);
            const targetNodeCd = findNode(simulatedState.fileSystem, resolvedCdPathArray);
            if (!targetNodeCd) output = `cd: ${targetCdPathStr}: No such file or directory\n`;
            else if (targetNodeCd.type !== 'directory') output = `cd: ${targetCdPathStr}: Not a directory\n`;
            else if (!checkPermissions(simulatedState.session.user, targetNodeCd, 'execute')) output = `cd: ${targetCdPathStr}: Permission denied\n`;
            else simulatedState.session.cwd = resolvedCdPathArray;
            break;
        case 'cat':
            if (args.length === 0) { output = 'cat: missing file operand\n'; break; }
            args.forEach(filePath => {
                const resolvedCatPath = resolvePath(simulatedState.session.cwd, filePath);
                const fileNode = findNode(simulatedState.fileSystem, resolvedCatPath);
                if (!fileNode) output += `cat: ${filePath}: No such file or directory\n`;
                else if (fileNode.type !== 'file') output += `cat: ${filePath}: Is a directory\n`;
                else if (!checkPermissions(simulatedState.session.user, fileNode, 'read')) output += `cat: ${filePath}: Permission denied\n`;
                else {
                    output += (fileNode.content || '');
                    if (fileNode.content && !fileNode.content.endsWith('\n')) output += '\n';
                    
                    let absPathParts = resolvedCatPath[0] === '' ? resolvedCatPath.slice(1) : resolvedCatPath;
                    const absPath = '/' + absPathParts.filter(p => p).join('/');
                    if (!simulatedState.session.filesRead.includes(absPath) && absPath !== '/') simulatedState.session.filesRead.push(absPath);
                }
            });
            break;
        case 'grep':
            const patternArg = args.find(arg => !arg.startsWith("-"));
            const optionsGrep = args.filter(arg => arg.startsWith("-"));
            const filesToGrep = args.filter(arg => !arg.startsWith("-") && arg !== patternArg);
            if (!patternArg || filesToGrep.length === 0 && !cmdStr.includes("|")) {
                 output = "Usage: grep [OPTIONS] PATTERN [FILE...]\n"; break; 
            }
            const ignoreCase = optionsGrep.includes("-i"); const invertMatch = optionsGrep.includes("-v"); const showLineNumbers = optionsGrep.includes("-n");
            try {
                const regex = new RegExp(patternArg, ignoreCase ? 'i' : '');
                if (filesToGrep.length > 0) {
                    filesToGrep.forEach(f => {
                        const node = findNode(simulatedState.fileSystem, resolvePath(simulatedState.session.cwd, f));
                        if (node && node.type === 'file' && checkPermissions(simulatedState.session.user, node, 'read')) {
                            (node.content || "").split('\n').forEach((line, index) => {
                                const match = regex.test(line);
                                if ((match && !invertMatch) || (!match && invertMatch)) {
                                    let linePrefix = (filesToGrep.length > 1 ? `${f}:` : "") + (showLineNumbers ? `${index + 1}:` : "");
                                    output += `${linePrefix}${line}\n`;
                                }
                            });
                        } else output += `grep: ${f}: No such file or directory or permission denied\n`;
                    });
                } else {
                    output = "grep: (standard input simulation not implemented without files)\n";
                }
            } catch (e) { output = `grep: Invalid regular expression: ${e.message}\n`; }
            break;
        case 'whoami': output = simulatedState.session.user + '\n'; break;
        case 'id':
            const targetUserId = args[0] || simulatedState.session.user;
            if (targetUserId === simulatedState.session.user || targetUserId === 'root' || findHostInNetwork(targetUserId)) {
                const isRoot = targetUserId === 'root';
                const uid = isRoot ? 0 : (simulatedState.session.user === targetUserId ? 1000 : 1001);
                const userGroups = isRoot ? ['root'] : (targetUserId === simulatedState.session.user ? (simulatedState.session.groups || ['users']) : ['users']);
                const primaryGroupName = userGroups[0];
                const primaryGid = primaryGroupName === 'root' ? 0 : (primaryGroupName === simulatedState.session.user ? 1000 : 1001) ;
                const groupsStr = userGroups.map((g,idx) => `${primaryGid + idx}(${g})`).join(',');
                output = `uid=${uid}(${targetUserId}) gid=${primaryGid}(${primaryGroupName}) groups=${groupsStr}\n`;
            } else output = `id: ${targetUserId}: no such user (simulated)\n`;
            break;
        case 'echo': output = args.join(' ') + '\n'; break;
        case 'touch':
            if (args.length === 0) { output = "touch: missing file operand\n"; break; }
            args.forEach(filePath => {
                const resolvedPathArr = resolvePath(simulatedState.session.cwd, filePath);
                if (resolvedPathArr.length === 1 && resolvedPathArr[0] === '') { output += `touch: cannot touch '/': Is a directory\n`; return; }
                const fileName = resolvedPathArr[resolvedPathArr.length - 1];
                const parentPathArr = resolvedPathArr.slice(0, -1);
                if (!fileName) { output += `touch: invalid file name '${filePath}'\n`; return; }
                const parentNode = findNode(simulatedState.fileSystem, parentPathArr.length === 0 ? [''] : parentPathArr);
                if (!parentNode || parentNode.type !== 'directory') { output += `touch: cannot touch '${filePath}': Parent component error or not a directory\n`; return; }
                if (!checkPermissions(simulatedState.session.user, parentNode, 'write')) { output += `touch: cannot touch '${filePath}': Permission denied in parent\n`; return; }
                let existingNode = parentNode.children.find(c => c.name === fileName);
                if (existingNode && existingNode.type === 'directory') { output += `touch: cannot touch '${filePath}': Is a directory\n`; }
                else if (!existingNode) {
                    parentNode.children.push({ name: fileName, type: 'file', permissions: '-rw-r--r--', owner: simulatedState.session.user, group: (simulatedState.session.groups||[])[0] || 'users', content: '' });
                }
            });
            break;
        case 'mkdir':
            const pOptionMkdir = args.includes("-p"); args = args.filter(a => a !== "-p");
            if (args.length === 0) { output = "mkdir: missing operand\n"; break; }
            args.forEach(dirPath => {
                let currentParentNode = simulatedState.fileSystem;
                let pathBeingBuiltAbs = []; 
                const partsToProcess = dirPath.startsWith('/') ? dirPath.split('/').filter(p=>p) : [...simulatedState.session.cwd.filter(p=>p), ...dirPath.split('/').filter(p=>p)];
                if (partsToProcess.length === 0 && dirPath === '/') { output += `mkdir: cannot create directory '/': File exists\n`; return;}

                for (let i = 0; i < partsToProcess.length; i++) {
                    const part = partsToProcess[i];
                    if (!part) continue; 
                    pathBeingBuiltAbs.push(part);
                    let node = findNode(simulatedState.fileSystem, pathBeingBuiltAbs);
                    if (node) {
                        if (node.type !== 'directory') { output += `mkdir: cannot create directory ‘${dirPath}’: File exists at ‘/${pathBeingBuiltAbs.join('/')}’\n`; return; }
                        currentParentNode = node;
                    } else {
                        const immediateParentPath = pathBeingBuiltAbs.slice(0, -1);
                        const immediateParentNode = findNode(simulatedState.fileSystem, immediateParentPath.length === 0 ? [''] : immediateParentPath);

                        if (i < partsToProcess.length - 1 && !pOptionMkdir) { output += `mkdir: cannot create directory ‘${dirPath}’: No such file or directory for parent of '${partsToProcess[i+1]}'\n`; return; }
                        if (!immediateParentNode || !checkPermissions(simulatedState.session.user, immediateParentNode, 'write')) { output += `mkdir: cannot create directory ‘${part}’ in ‘/${immediateParentPath.join('/')}’: Permission denied\n`; return; }
                        
                        const newDir = { name: part, type: 'directory', permissions: 'drwxr-xr-x', owner: simulatedState.session.user, group: (simulatedState.session.groups||[])[0] || 'users', children: [] };
                        immediateParentNode.children.push(newDir);
                        currentParentNode = newDir;
                    }
                }
            });
            break;
        case 'head': case 'tail':
            const nOptIdxHT = args.findIndex(a => a === '-n'); let numLinesHT = 10; let fileForHT = null;
            let tempArgsHT = [...args];
            if (nOptIdxHT !== -1 && tempArgsHT[nOptIdxHT + 1]) {
                const nVal = parseInt(tempArgsHT[nOptIdxHT + 1]); if (!isNaN(nVal) && nVal > 0) numLinesHT = nVal;
                tempArgsHT.splice(nOptIdxHT, 2);
            } else {
                const nCombinedOptIdx = tempArgsHT.findIndex(a => a.startsWith("-n") && parseInt(a.substring(2)) > 0);
                if (nCombinedOptIdx !== -1) { numLinesHT = parseInt(tempArgsHT[nCombinedOptIdx].substring(2)); tempArgsHT.splice(nCombinedOptIdx, 1); }
            }
            fileForHT = tempArgsHT.find(a => !a.startsWith('-'));
            if (!fileForHT) { output = `${baseCmd}: missing file operand\n`; break; }
            const nodeHT = findNode(simulatedState.fileSystem, resolvePath(simulatedState.session.cwd, fileForHT));
            if (!nodeHT) output = `${baseCmd}: ${fileForHT}: No such file or directory\n`;
            else if (nodeHT.type !== 'file') output = `${baseCmd}: error reading '${fileForHT}': Is a directory\n`;
            else if (!checkPermissions(simulatedState.session.user, nodeHT, 'read')) output = `${baseCmd}: ${fileForHT}: Permission denied\n`;
            else {
                const lines = (nodeHT.content || "").split('\n');
                const relevantLines = baseCmd === 'head' ? lines.slice(0, numLinesHT) : lines.slice(-numLinesHT);
                output = relevantLines.join('\n');
                if (relevantLines.length > 0 && (nodeHT.content.endsWith('\n') || relevantLines.join('\n') !== nodeHT.content )) {
                     output += '\n';
                }
            }
            break;
        case 'man':
            if (args.length === 0) { output = "What manual page do you want?\n"; break; }
            const manCmdName = args[0]; const manDefResolved = commandDefinitions[manCmdName]; // Use a different var name
            if (manDefResolved) {
                output = `${manCmdName.toUpperCase()}(1) User Commands ${manCmdName.toUpperCase()}(1)\n\nNAME\n    ${manCmdName} - ${manDefResolved.description}\n\nSYNOPSIS\n    ${manDefResolved.usage}\n`;
                if (manDefResolved.options && manDefResolved.options.length > 0) {
                    output += "\nOPTIONS\n";
                    manDefResolved.options.forEach(opt => { output += `    ${opt.flag}\n        ${opt.description}\n`; });
                }
            } else output = `No manual entry for ${manCmdName}\n`;
            break;
        case 'nmap':
            const targetNmapArg = args.find(arg => !arg.startsWith('-') && arg !== '-sV'); // -sV is an option, not a target
            const showVersion = args.includes('-sV');
            let portsToScan = [];
            const pOptionIndex = args.indexOf('-p');
            if (pOptionIndex !== -1 && args[pOptionIndex + 1]) {
                portsToScan = args[pOptionIndex + 1].split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
            }

            if (!targetNmapArg) {
                output = 'Nmap: You must specify a target host.\nUsage: nmap [options] <target>\n';
                break;
            }

            const hostData = findHostInNetwork(targetNmapArg);
            if (!hostData) {
                output = `Failed to resolve "${targetNmapArg}".\nNmap done: 1 IP address (0 hosts up) scanned in 0.01 seconds\n`;
                break;
            }

            output = `Starting Nmap 7.92 ( https://nmap.org ) at ${new Date().toUTCString()}\n`;
            output += `Nmap scan report for ${hostData.name} (${(hostData.ips && hostData.ips[0]) || 'unknown-ip'})\n`;
            output += `Host is up (0.001s latency).\n`;

            let openPortsFound = [];
            if (hostData.openPorts && hostData.openPorts.length > 0) {
                hostData.openPorts.forEach(portInfo => {
                    if (portsToScan.length === 0 || portsToScan.includes(portInfo.port)) {
                        let line = `${String(portInfo.port).padEnd(5)}/tcp open  ${(portInfo.service || 'unknown').padEnd(10)}`;
                        if (showVersion && portInfo.banner) {
                            line += ` ${portInfo.banner}`;
                        }
                        openPortsFound.push(line);
                    }
                });
            }

            if (openPortsFound.length > 0) {
                output += `Not shown: ${1000 - openPortsFound.length} closed ports\n`; // Simulated total ports
                output += `PORT     STATE SERVICE  ${showVersion ? 'VERSION' : ''}\n`;
                output += openPortsFound.join('\n') + '\n';
            } else {
                output += `All ${portsToScan.length > 0 ? portsToScan.length : 1000} scanned ports on ${hostData.name} are closed.\n`;
            }
            output += `\nNmap done: 1 IP address (1 host up) scanned in 0.50 seconds\n`;
            break;
        // TODO: Implement other commands as needed: rm, cp, mv, find, ps, kill, systemctl, tar, unzip,
        // ping, ssh, scp, wget, curl, hostname, ifconfig, ip, netstat, traceroute, nslookup, dig
        
        case 'rm': case 'cp': case 'mv': case 'find': case 'ps': case 'kill': case 'systemctl':
        case 'tar': case 'unzip': case 'ping': case 'ssh': case 'scp': case 'wget': case 'curl':
        case 'hostname': case 'ifconfig': case 'ip': case 'netstat': case 'traceroute':
        case 'nslookup': case 'dig':
            output = `${baseCmd}: Command logic not yet fully implemented in this simulation.\n`;
            if (commandDefinitions[baseCmd] && commandDefinitions[baseCmd].usage) {
                output += `Usage: ${commandDefinitions[baseCmd].usage}\n`;
            }
            break;
            
        default:
             if (commandDefinitions[baseCmd]) output = `${baseCmd}: Command logic not yet fully implemented here. Refer to full command list.\n`;
             else output = `${baseCmd}: command not found\n`;
            break;
    }
    return { output, speed };
}


function getCompletionCandidates(buffer, currentCwdArray) {
    const trimmedBuffer = buffer.trimStart();
    const parts = trimmedBuffer.split(/\s+/).filter(p => p.length > 0);
    const lastPartTyped = parts.length > 0 ? parts[parts.length - 1] : "";
    const isNewArgument = buffer.endsWith(' ') || buffer === "" || parts.length === 0;
    const commandPart = parts[0];

    // Command completion
    if (parts.length <= 1 && !isNewArgument) {
        return Object.keys(commandDefinitions).filter(cmd => cmd.startsWith(lastPartTyped)).sort();
    }

    let pathToComplete = isNewArgument ? "" : lastPartTyped;
    let baseDirForCompletion = [...currentCwdArray];
    let pathPrefix = "";

    // Handle options for the current command
    const cmdDefForOptions = commandDefinitions[commandPart];
    if (cmdDefForOptions && cmdDefForOptions.options && (isNewArgument || lastPartTyped.startsWith('-'))) {
        let optionCandidates = [];
        cmdDefForOptions.options.forEach(opt => { 
            const mainFlag = opt.flag.split(',')[0].trim(); // e.g., -p from -p PORTS
            if (mainFlag.startsWith(lastPartTyped)) {
                 optionCandidates.push(mainFlag + (mainFlag.endsWith('S') || mainFlag.endsWith('E') ? '' : ' ')); // Add space unless it's like -sV where V is part of it
            }
        });
        if (optionCandidates.length > 0) return optionCandidates.sort(); // Prioritize option completion if typing one
    }
    
    // Path completion
    if (commandPart && (commandPart !== 'man' || parts.length > 2)) { // Don't do path completion for man's first arg
        if (pathToComplete.includes('/')) {
            const pathSegments = pathToComplete.split('/'); 
            const partialName = pathSegments.pop() || ""; 
            pathPrefix = pathSegments.join('/') + (pathSegments.length > 0 ? '/' : '');
            if (pathToComplete.startsWith('/')) baseDirForCompletion = ['']; // Absolute path
            else baseDirForCompletion = [...currentCwdArray]; // Relative path, start from cwd

            baseDirForCompletion = resolvePath(baseDirForCompletion, pathSegments.join('/'));
            pathToComplete = partialName;
        } else if (isNewArgument) { // if it's a new argument, complete from current dir
             pathToComplete = ""; // complete everything in the dir
        }
        // else: completing current word which is not a path segment yet, e.g. "ls myf"

        const dirNode = findNode(simulatedState.fileSystem, baseDirForCompletion);
        if (dirNode && dirNode.type === 'directory' && Array.isArray(dirNode.children)) {
            if (!checkPermissions(simulatedState.session.user, dirNode, 'execute') && baseDirForCompletion.join('/') !== simulatedState.session.cwd.join('/')) { // Allow completion in CWD even if no execute
                 return [];
            }
            let pathCandidates = dirNode.children
                .filter(child => child.name.startsWith(pathToComplete))
                .map(child => { 
                    let comp = pathPrefix + child.name; 
                    if (child.type === 'directory') comp += '/'; 
                    else comp += ' '; 
                    return comp; 
                });
            return pathCandidates.sort();
        }
    }
    
    // Argument completion for specific commands (like 'man')
    if (commandPart === 'man' && (parts.length === 2 || (parts.length === 1 && isNewArgument))) {
        return Object.keys(commandDefinitions).filter(cmd => cmd.startsWith(lastPartTyped)).sort();
    }

    return [];
}