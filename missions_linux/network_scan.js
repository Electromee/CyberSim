// missions_linux/network_scan.js

export const levelConfig = {
    id: 'network_scan',
    name: 'Scan de Port - Reconnaissance Serveur Web',
    category: 'Réseau',
    description: 'Un nouveau serveur web a été déployé sur le réseau interne : webserver.internal.lan. Votre mission est d\'identifier les ports ouverts sur cette machine, en particulier les ports des services web standards (HTTP, HTTPS) et tout autre port potentiellement inattendu. Vous devrez utiliser l\'option -sV de nmap pour voir les bannières des services.',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'analyst', type: 'directory', owner: 'analyst', group: 'analysts', permissions: 'drwxr-xr-x', children: [
                        { name: 'scan_notes.txt', type: 'file', owner: 'analyst', group: 'analysts', permissions: '-rw-r--r--', content: 'Objectif: Scanner webserver.internal.lan\nPorts à vérifier: 80, 443, et autres.\nUtiliser nmap -sV pour les détails des services.\n' }
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
        networkState: { 
            hosts: {
                'analysis-station': { 
                    ips: ['192.168.1.10'],
                    openPorts: [] 
                },
                'webserver.internal.lan': {
                    ips: ['192.168.1.100'], 
                    domainNames: ['webserver.internal.lan'], // Added domain name
                    openPorts: [
                        { port: 22, service: 'ssh', banner: 'OpenSSH 8.2p1 Ubuntu-4ubuntu0.3' },
                        { port: 80, service: 'http', banner: 'Apache/2.4.41 (Ubuntu)' },
                        { port: 3306, service: 'mysql', banner: 'MySQL 8.0.22 - FLAG{P0RT_SC4N_SUCCESS_DB_EXPOSED}' }, 
                        { port: 8080, service: 'http-alt', banner: 'Apache Tomcat/9.0.50 - Dev Instance' }
                    ]
                },
                'fileserver.internal.lan': { 
                    ips: ['192.168.1.150'],
                    domainNames: ['fileserver.internal.lan'], // Added domain name
                    openPorts: [
                        { port: 22, service: 'ssh', banner: 'OpenSSH_7.6p1 Debian-10' },
                        { port: 139, service: 'netbios-ssn', banner: 'Samba smbd'},
                        { port: 445, service: 'microsoft-ds', banner: 'Samba smbd'}
                    ]
                }
            },
            dnsServers: ['192.168.1.1'], // Assuming a local DNS can resolve these
            defaultGateway: '192.168.1.1'
        }
    },
    objectives: [
        {
            id: 'scan_target_server',
            description: 'Lire les notes initiales et initier un scan de ports sur `webserver.internal.lan` avec `nmap -sV`.',
            check: (state, lastCommandOutput) => {
                const notesRead = state.session.filesRead.includes('/home/analyst/scan_notes.txt');
                // Check if nmap was run against the target in the last command (simplistic check)
                const nmapRunOnTarget = lastCommandOutput && 
                                        lastCommandOutput.includes('Nmap scan report for webserver.internal.lan') &&
                                        lastCommandOutput.includes('-sV might be required'); // Prompt if they forget -sV
                // Or more simply, if notes are read and any nmap output for the target is present
                const nmapRan = lastCommandOutput && lastCommandOutput.includes('Nmap scan report for webserver.internal.lan');
                return notesRead && nmapRan;
            },
            message: 'Scan initié. Analysez bien les résultats des services !'
        },
        {
            id: 'nmap_http_found',
            description: 'Identifier si le port HTTP (80) est ouvert sur `webserver.internal.lan` en utilisant `nmap -sV`.',
            check: (state, lastCommandOutput) => {
                // Check if nmap output shows port 80 open for the target
                return lastCommandOutput && 
                       lastCommandOutput.includes('Nmap scan report for webserver.internal.lan') &&
                       lastCommandOutput.includes('80/tcp open  http');
            },
            message: 'Port HTTP (80) identifié comme ouvert !'
        },
        {
            id: 'flag_port_identified',
            description: 'Identifier le port inattendu (non-HTTP/S, non-SSH) qui contient le FLAG grâce à sa bannière de service.',
            check: (state, lastCommandOutput) => {
                 // This objective is met if the flag is found, implying they saw the banner of the correct port.
                 // The flag extraction objective will be the primary trigger.
                 return state.objectivesCompleted.includes('extract_flag_from_banner');
            },
            message: 'Port suspect avec bannière révélatrice identifié !'
        },
        { 
            id: 'extract_flag_from_banner',
            description: 'Extraire le FLAG (FLAG{P0RT_SC4N_SUCCESS_DB_EXPOSED}) en observant les bannières des services scannés.',
            check: (state, lastCommandOutput) => {
                // MODIFIED: Check the last command's output for the flag.
                // This requires the nmap command in sim-engine.js to output banners when -sV is used.
                return lastCommandOutput && lastCommandOutput.includes('FLAG{P0RT_SC4N_SUCCESS_DB_EXPOSED}');
            },
             message: 'FLAG extrait avec succès de la bannière du service !'
        }
    ],
    hints: [
        "Commencez par lire le fichier `scan_notes.txt` dans votre répertoire personnel.",
        "Utilisez `nmap -sV webserver.internal.lan` pour un scan détaillé incluant les versions des services (bannières).",
        "Nmap peut scanner des ports spécifiques avec l'option `-p`. Par exemple : `nmap -sV -p 80,443,3306 webserver.internal.lan`.",
        "Examinez attentivement la sortie de `nmap` pour la colonne 'SERVICE' et 'VERSION' (bannière).",
        "Certains services peuvent révéler des informations sensibles ou des drapeaux (flags) dans leurs bannières."
    ],
    winCondition: ['extract_flag_from_banner'], 
};
