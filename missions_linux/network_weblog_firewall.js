// missions_linux/network_weblog_firewall.js

export const levelConfig = {
    id: 'network_weblog_firewall',
    name: 'Net 3: Analyse de Logs Web & Accès Alternatif',
    category: 'Réseau',
    description: 'Le serveur web `corporate-web.internal.lan` semble avoir des problèmes de performance. Vous avez accès à un extrait de ses logs. Analysez les logs pour identifier une IP suspecte causant potentiellement un déni de service (trop de requêtes 404). Ensuite, on suspecte que l\'accès standard au service applicatif sur le port 8000 est filtré pour votre IP. Trouvez un port alternatif pour ce service.',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', children: [
                    { name: 'sec-analyst', type: 'directory', permissions: 'drwxr-xr-x', owner: 'sec-analyst', children: [
                        { name: 'logs', type: 'directory', permissions: 'drwxr-xr-x', owner: 'sec-analyst', children: [
                            { 
                                name: 'access.log', 
                                type: 'file', 
                                owner: 'sec-analyst', 
                                permissions: '-rw-r--r--',
                                content: 
`192.168.5.50 - - [10/Oct/2023:10:00:00 +0000] "GET /index.html HTTP/1.1" 200 1024
192.168.5.51 - - [10/Oct/2023:10:00:01 +0000] "GET /styles.css HTTP/1.1" 200 512
10.0.0.100 - - [10/Oct/2023:10:00:02 +0000] "GET /admin/login.php HTTP/1.1" 404 128
10.0.0.100 - - [10/Oct/2023:10:00:03 +0000] "GET /wp-admin/ HTTP/1.1" 404 128
192.168.5.52 - - [10/Oct/2023:10:00:04 +0000] "GET /images/logo.png HTTP/1.1" 200 2048
10.0.0.100 - - [10/Oct/2023:10:00:05 +0000] "GET /config.bak HTTP/1.1" 404 128
10.0.0.100 - - [10/Oct/2023:10:00:06 +0000] "GET /old_login.html HTTP/1.1" 404 128
10.0.0.100 - - [10/Oct/2023:10:00:07 +0000] "GET /backup/db.sql HTTP/1.1" 404 128
192.168.5.50 - - [10/Oct/2023:10:00:08 +0000] "GET /contact.html HTTP/1.1" 200 768
FLAG_IP_SUSPECTE_IS_10.0.0.100
` // Flag embedded to guide user.
                            }
                        ]},
                        { name: 'report.txt', type: 'file', owner: 'sec-analyst', permissions: '-rw-------', content: 'Rapport d\'incident en cours...\nIP Suspecte: \nService alternatif: \n' }
                    ]}
                ]}
            ]
        },
        session: {
            user: 'sec-analyst',
            host: 'soc- workstation',
            cwd: ['home', 'sec-analyst'],
            home: ['home', 'sec-analyst'],
            groups: ['sec-analysts', 'users']
        },
        networkState: {
            hosts: {
                'soc-workstation': { ips: ['192.168.5.10'], openPorts: [] },
                'corporate-web.internal.lan': {
                    ips: ['192.168.5.100'],
                    domainNames: ['corporate-web.internal.lan'],
                    openPorts: [
                        { port: 80, service: 'http', banner: 'Nginx/1.18' },
                        { port: 443, service: 'https', banner: 'Nginx/1.18 OpenSSL' },
                        // Port 8000 is the target service, but we'll simulate it as "filtered" for user
                        // then open on 8001. Nmap needs to show "filtered" or "closed".
                        // For simulation, we can omit 8000 for user's IP, but have 8001 open.
                        { port: 8001, service: 'http-alt', banner: 'PythonAppSrv - FLAG_ALT_PORT_ACCESS_8001' }
                    ],
                    // Advanced: define filtered ports if nmap can show them
                    // filteredPortsFor: { '192.168.5.10': [8000] } // User's IP
                }
            },
            dnsServers: ['192.168.5.1'],
            defaultGateway: '192.168.5.1'
        }
    },
    objectives: [
        {
            id: 'analyze_logs',
            description: 'Analyser `~/logs/access.log` pour identifier une IP générant de nombreuses erreurs 404.',
            check: (state, lastCommandOutput) => {
                // Check if user has read the log and grep'd for the IP or 404s.
                // For simplicity, if they grep for "404" in the log file:
                const logRead = state.session.filesRead.includes('/home/sec-analyst/logs/access.log');
                const grepFor404 = lastCommandOutput && 
                                 lastCommandOutput.includes('GET /admin/login.php HTTP/1.1" 404') &&
                                 lastCommandOutput.includes('10.0.0.100');
                return logRead && grepFor404;
            },
            message: 'Logs analysés, IP suspecte (10.0.0.100) repérée !'
        },
        {
            id: 'identify_flag_ip',
            description: 'Noter l\'IP suspecte (FLAG_IP_SUSPECTE_IS_10.0.0.100).',
            check: (state, lastCommandOutput) => {
                 // This could be if they cat the log file, or grep for the flag in the log file
                 return state.session.filesRead.includes('/home/sec-analyst/logs/access.log') &&
                        lastCommandOutput && lastCommandOutput.includes('FLAG_IP_SUSPECTE_IS_10.0.0.100');
            },
            message: 'IP suspecte correctement identifiée et notée !'
        },
        {
            id: 'find_alt_service_port',
            description: 'Scanner `corporate-web.internal.lan` pour trouver un port de service applicatif alternatif (non 80/443). Le port 8000 est supposé être filtré pour vous.',
            check: (state, lastCommandOutput) => {
                // User uses nmap and sees port 8001 open with the specific banner
                return lastCommandOutput &&
                       lastCommandOutput.includes('Nmap scan report for corporate-web.internal.lan') &&
                       lastCommandOutput.includes('8001/tcp open  http-alt PythonAppSrv - FLAG_ALT_PORT_ACCESS_8001');
            },
            message: 'Port de service alternatif 8001 trouvé avec sa bannière !'
        }
    ],
    hints: [
        "Utilisez `cat`, `grep`, `head`, `tail` pour analyser le fichier `logs/access.log`.",
        "Recherchez les lignes contenant '404' et comptez les occurrences par IP (ou cherchez la 'FLAG_IP_SUSPECTE').",
        "Une fois l'IP suspecte trouvée, scannez `corporate-web.internal.lan` avec `nmap -sV`.",
        "Si un port attendu (comme 8000) semble fermé ou filtré, cherchez d'autres ports ouverts inhabituels."
    ],
    winCondition: ['identify_flag_ip', 'find_alt_service_port']
};