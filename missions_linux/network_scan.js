// missions_linux/network_scan.js

export const levelConfig = {
    id: 'network_scan',
    name: 'Scan de Port - Reconnaissance Serveur Web',
    category: 'Réseau', // Make sure this category exists in your index.html menu
    description: 'Un nouveau serveur web a été déployé sur le réseau interne : webserver.internal.lan. Votre mission est d\'identifier les ports ouverts sur cette machine, en particulier les ports des services web standards (HTTP, HTTPS) et tout autre port potentiellement inattendu.',
    initialState: {
        fileSystem: { // Minimal file system, focus is on network
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'analyst', type: 'directory', owner: 'analyst', group: 'analysts', permissions: 'drwxr-xr-x', children: [
                        { name: 'scan_notes.txt', type: 'file', owner: 'analyst', group: 'analysts', permissions: '-rw-r--r--', content: 'Objectif: Scanner webserver.internal.lan\nPorts à vérifier: 80, 443\nNoter autres ports ouverts.\n' }
                    ]}
                ]}
            ]
        },
        session: {
            user: 'analyst',
            host: 'analysis-station',
            cwd: ['home', 'analyst'],
            home: ['home', 'analyst'],
            groups: ['analysts', 'users']
        },
        networkState: { // Define the state of the network for this mission
            hosts: {
                'analysis-station': { // The machine the user is on
                    ips: ['192.168.1.10'],
                    openPorts: [] 
                },
                'webserver.internal.lan': {
                    ips: ['192.168.1.100'], // Target server IP
                    openPorts: [
                        { port: 22, service: 'ssh', banner: 'OpenSSH 8.2p1 Ubuntu-4ubuntu0.3' },
                        { port: 80, service: 'http', banner: 'Apache/2.4.41 (Ubuntu)' },
                        // HTTPS port is intentionally "missing" or "closed" for this scenario, or you can add it.
                        // { port: 443, service: 'https', banner: 'Apache/2.4.41 (Ubuntu) OpenSSL' },
                        { port: 3306, service: 'mysql', banner: 'MySQL 8.0.22 - FLAG{P0RT_SC4N_SUCCESS_DB_EXPOSED}' }, // An "unexpected" open port with the flag
                        { port: 8080, service: 'http-alt', banner: 'Apache Tomcat/9.0.50 - Dev Instance' } // Another interesting port
                    ]
                },
                'fileserver.internal.lan': { // Another host, not the target, to make nmap more specific
                    ips: ['192.168.1.150'],
                    openPorts: [
                        { port: 22, service: 'ssh' },
                        { port: 139, service: 'netbios-ssn'},
                        { port: 445, service: 'microsoft-ds'}
                    ]
                }
            }
        }
    },
    objectives: [
        {
            id: 'scan_target_server',
            description: 'Effectuer un scan de ports sur `webserver.internal.lan` avec `nmap`.',
            // Check: This objective could be tricky to check directly without parsing nmap output.
            // For simplicity, we can assume using nmap on the target implies attempting the scan.
            // A more robust check would involve the sim-engine logging nmap targets.
            // For now, we'll make it dependent on finding one of the key ports.
            check: (state, commandHistory) => { // commandHistory would be a new param if we log commands
                // Placeholder: this objective is met if the user finds any port on the target.
                // A better check would be if a specific nmap command was run against the target.
                // For now, let's tie it to finding the HTTP port.
                // This check will be re-evaluated if 'nmap_http_found' objective's check passes.
                // A simpler way: if the user cats scan_notes.txt, they've started.
                return state.session.filesRead.includes('/home/analyst/scan_notes.txt');
            },
            message: 'Scan initié. Analysez bien les résultats !'
        },
        {
            id: 'nmap_http_found',
            description: 'Identifier si le port HTTP (80) est ouvert sur `webserver.internal.lan`.',
            // This is also hard to check directly without parsing nmap output or logging nmap results.
            // We'll assume if the user tries to wget/curl port 80, or if the FLAG is found (which means they saw port 3306's banner).
            // For now, let's make this objective also reliant on finding the flag.
            // A better simulation would have the sim-engine store "discovered ports" per host in the state.
            check: (state) => {
                // This is a proxy. Ideally, sim-engine would populate a list of 'discovered_ports' by nmap.
                // If they found the flag, they must have seen the nmap output listing port 3306.
                return state.objectivesCompleted.includes('flag_port_identified');
            },
            message: 'Port HTTP (80) identifié comme ouvert !'
        },
        {
            id: 'flag_port_identified',
            description: 'Identifier le port inattendu contenant le FLAG et noter son service.',
            // This is the main objective. The flag is in the banner of port 3306.
            // We can't directly check if they "noted the service" easily.
            // The win condition will be finding the FLAG.
            // Let's assume they find the flag by seeing the nmap output.
            // A more direct check would be if they try to connect to port 3306, or grep for "FLAG" in nmap output (if we stored it).
            // For this simple version, the FLAG itself is the objective.
            // The `winCondition` will point to this. The text of the objective guides them.
            // The level's winCondition will be this objective.
            // We need a way for the FLAG to be "extracted"
            // We'll make the FLAG objective depend on a simulated `grep` for the flag in a hypothetical nmap output file,
            // OR, more simply, we make the `sim-engine`'s `nmap` command check if the FLAG is in a banner of a scanned port and if so, set a state variable.
            // For now, let's make this objective complete when the level's winCondition (tied to the FLAG) is met.
            // This objective will be marked as complete when the "FLAG" objective (implicit) is met.
            // To make it explicit, we need sim-engine's nmap to "reveal" the flag, or for the user to cat a file containing it.
            // The FLAG is in the banner. So nmap output will show it.
            // Let's say this objective is met if the winCondition (extract_flag_from_banner) is met.
            check: (state) => {
                 // This will be true if the `extract_flag_from_banner` (our winCondition) is met.
                 // We'll add a specific winCondition objective.
                 return state.objectivesCompleted.includes('extract_flag_from_banner');
            },
            message: 'Port suspect identifié et FLAG repéré ! Excellent travail d\'analyse.'
        },
        { // This will be our actual win condition objective
            id: 'extract_flag_from_banner',
            description: 'Extraire le FLAG (FLAG{P0RT_SC4N_SUCCESS_DB_EXPOSED}).', // Hidden from user, for game logic
            check: (state, lastCommandOutput) => {
                // This check needs to be triggered after an nmap command.
                // The sim-engine's nmap command needs to be modified.
                // If nmap output (returned by sim-engine) contains the flag, this is true.
                // This requires `lastCommandOutput` to be passed to check functions.
                // OR we set a flag in `simulatedState` when nmap reveals the flag.
                
                // Simpler: If the `nmap` command in `sim-engine.js` itself detects it's showing a banner
                // with "FLAG{", it can directly trigger an 'objectiveComplete' for this.
                // For now, we'll make this an "auto-complete" objective that the game engine
                // will trigger if the nmap command's output contained the flag.
                // This requires `sim-engine.js` to be aware of this objective ID.
                return false; // This will be triggered by sim-engine directly.
            },
             message: 'FLAG extrait avec succès !' // This message might not be shown if level ends immediately.
        }
    ],
    hints: [
        "Utilisez `nmap webserver.internal.lan` pour un scan de base.",
        "Nmap peut scanner des ports spécifiques avec l'option `-p`. Par exemple : `nmap -p 80,443 webserver.internal.lan`.",
        "Examinez attentivement la sortie de `nmap` pour la colonne 'SERVICE' et toute information supplémentaire (bannière).",
        "Certains services peuvent révéler des informations sensibles dans leurs bannières."
    ],
    winCondition: ['extract_flag_from_banner'], // The player wins when this specific objective is met
};