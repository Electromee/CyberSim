// missions_linux/network_hidden_service.js

export const levelConfig = {
    id: 'network_hidden_service',
    name: 'Net 4: Chasse au Service Caché',
    category: 'Réseau',
    description: 'Un service critique mais discret a été déployé sur `critical-server.internal.lan`. Il n\'écoute pas sur un port standard. Votre mission est d\'utiliser `nmap` pour découvrir ce service, identifier son port et récupérer une information (FLAG) depuis sa bannière.',
    initialState: {
        fileSystem: {
             name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', children: [
                    { name: 'pentester', type: 'directory', owner: 'pentester', children: [
                        { name: 'mission_brief.txt', type: 'file', owner: 'pentester', content: 'Cible: critical-server.internal.lan\nObjectif: Trouver port et service cachés. Récupérer le flag depuis la bannière du service.\nOutils suggérés: nmap -sV\n' }
                    ]}
                ]}
            ]
        },
        session: {
            user: 'pentester',
            host: 'kali-sim',
            cwd: ['home', 'pentester'],
            home: ['home', 'pentester'],
            groups: ['pentesters', 'users']
        },
        networkState: {
            hosts: {
                'kali-sim': { ips: ['10.10.10.5'], openPorts: [] },
                'critical-server.internal.lan': {
                    ips: ['10.10.10.100'],
                    domainNames: ['critical-server.internal.lan'],
                    openPorts: [
                        { port: 22, service: 'ssh', banner: 'OpenSSH 8.9p1 Ubuntu-3ubuntu0.1' },
                        { port: 12345, service: 'unknown', banner: 'CustomControlPanel v1.2 - FLAG_HIDDEN_SERVICE_FOUND_GG' } // The hidden service
                    ]
                },
                'other-server.internal.lan': { // Decoy
                    ips: ['10.10.10.101'],
                    domainNames: ['other-server.internal.lan'],
                    openPorts: [ {port: 80, service: 'http'}, {port: 443, service: 'https'}]
                }
            },
            dnsServers: ['10.10.10.1'],
            defaultGateway: '10.10.10.1'
        }
    },
    objectives: [
        {
            id: 'read_brief',
            description: 'Lire le briefing de la mission `mission_brief.txt`.',
            check: (state) => state.session.filesRead.includes('/home/pentester/mission_brief.txt'),
            message: 'Briefing lu. Préparez votre scan !'
        },
        {
            id: 'scan_critical_server',
            description: 'Effectuer un scan de `critical-server.internal.lan` pour identifier les ports ouverts.',
            check: (state, lastCommandOutput) => {
                return lastCommandOutput &&
                       lastCommandOutput.includes('Nmap scan report for critical-server.internal.lan');
            },
            message: 'Scan de critical-server.internal.lan effectué.'
        },
        {
            id: 'find_hidden_port_banner',
            description: 'Identifier le port non standard (ni 22, 80, 443) et sa bannière contenant le FLAG sur `critical-server.internal.lan`.',
            check: (state, lastCommandOutput) => {
                return lastCommandOutput &&
                       lastCommandOutput.includes('12345/tcp open  unknown  CustomControlPanel v1.2 - FLAG_HIDDEN_SERVICE_FOUND_GG');
            },
            message: 'Service caché sur le port 12345 trouvé et FLAG récupéré ! Excellent travail !'
        }
    ],
    hints: [
        "Lisez d'abord `mission_brief.txt`.",
        "Utilisez `nmap -sV critical-server.internal.lan` pour scanner tous les ports TCP par défaut et obtenir les bannières.",
        "Si le scan par défaut ne trouve rien d'intéressant, vous pourriez avoir besoin de scanner tous les ports (`-p-`), mais pour cette mission, le port est dans la plage par défaut de nmap.",
        "Recherchez un port avec un service marqué 'unknown' ou un nom de service inhabituel, et examinez sa bannière.",
    ],
    winCondition: ['find_hidden_port_banner']
};