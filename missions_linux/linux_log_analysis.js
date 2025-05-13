// missions_linux/linux_log_analysis.js
export const levelConfig = {
    id: 'linux_log_analysis',
    name: 'Analyse de Logs Web',
    category: 'Commandes Linux Avancées', // Or a new category
    description: 'Notre serveur web principal (`appserver.log`) a des ratés. Analysez les logs pour trouver les messages d\'erreur critiques (contenant "FATAL_ERROR") et identifiez une adresse IP suspecte (format X.X.X.X) qui apparaît fréquemment près de ces erreurs. Un fragment de code de récupération se trouve aussi dans `debug.log` (FLAG).',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'var', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'log', type: 'directory', owner: 'root', group: 'syslog', permissions: 'drwxr-xr-x', children: [
                        { 
                            name: 'appserver.log', type: 'file', owner: 'www-data', group: 'www-data', permissions: '-rw-r-----', 
                            content: 
`INFO: Server startup sequence initiated.
DEBUG: Module A loaded.
INFO: Request from 192.168.1.55 - /index.html - OK
WARNING: Low memory detected.
INFO: Request from 10.0.5.12 - /api/data - OK
FATAL_ERROR: Database connection pool exhausted by 172.16.33.101 - Service interruption.
INFO: Attempting to recover...
DEBUG: Cache cleared.
INFO: Request from 192.168.1.55 - /about.html - OK
INFO: Request from 172.16.33.101 - /login - FAILED_ATTEMPT
FATAL_ERROR: Unhandled exception in payment module caused by 172.16.33.101 - Payment processing halted.
INFO: Request from 10.0.5.13 - /status - OK
DEBUG: Worker thread 3 active.
WARNING: High CPU load on core 2.
INFO: Request from 172.16.33.101 - /admin - UNAUTHORIZED
FATAL_ERROR: Security breach attempt from 172.16.33.101 - System lockdown initiated.
INFO: All services shutting down for maintenance.` 
                        },
                        {
                            name: 'debug.log', type: 'file', owner: 'devops', group: 'developers', permissions: '-rw-rw----',
                            content: 
`Timestamp: 10:00:00 - Debug point A
Timestamp: 10:00:05 - Variable X = 5
Timestamp: 10:00:10 - Entering critical section
Timestamp: 10:00:15 - Potential issue with loop counter.
Timestamp: 10:00:20 - FLAG{L0G_D1V3R_PRO_GR3P_M4ST3R}
Timestamp: 10:00:25 - Exiting critical section.
Timestamp: 10:00:30 - Operation normal.`
                        },
                        { name: 'access.log', type: 'file', owner: 'www-data', group: 'www-data', permissions: '-rw-r-----', content: 'Lots of normal access lines...\n172.16.33.101 - - [10/Oct/2023:10:00:12 +0000] "POST /login HTTP/1.1" 200 1034\n...' }
                    ]}
                ]},
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'analyst', type: 'directory', owner: 'analyst', group: 'analysts', permissions: 'drwxr-xr-x', children: [] }
                ]}
            ]
        },
        session: {
            user: 'analyst', // Has read access to /var/log via group or other perms
            host: 'log-analyzer',
            cwd: ['home', 'analyst'],
            home: ['home', 'analyst'],
            groups: ['analysts', 'syslog'] // Member of syslog to read logs
        }
    },
    objectives: [
        {
            id: 'goto_logs',
            description: 'Naviguer vers le répertoire des logs (`/var/log`).',
            check: (state) => state.session.cwd.join('/') === 'var/log',
            message: 'Vous êtes dans le répertoire des logs.'
        },
        {
            id: 'find_fatal_errors',
            description: 'Utiliser `grep` pour trouver les lignes contenant "FATAL_ERROR" dans `appserver.log`.',
            // This is hard to check without seeing command history or output.
            // We'll assume if they find the suspicious IP, they must have grepped for errors.
            check: (state) => state.objectivesCompleted.includes('identify_suspicious_ip'),
            message: 'Messages d\'erreur critiques localisés !'
        },
        {
            id: 'identify_suspicious_ip',
            description: 'Identifier l\'adresse IP (172.16.33.101) qui cause les problèmes.',
            // This would be confirmed if they, for example, grep for this IP or report it.
            // For the game, we can assume if they find the FLAG, they've done the analysis.
            // We'll make this objective dependent on finding the flag.
            check: (state) => state.objectivesCompleted.includes('find_debug_flag'),
            message: 'IP suspecte (172.16.33.101) identifiée !'
        },
        {
            id: 'find_debug_flag',
            description: 'Trouver et afficher le FLAG dans `debug.log`.',
            check: (state) => state.session.filesRead.includes('/var/log/debug.log'), // Reading the file is enough for this
            message: 'FLAG du journal de débogage trouvé !'
        }
    ],
    hints: [
        "Les logs sont dans `/var/log`.",
        "`grep \"TEXTE_A_CHERCHER\" nom_du_fichier` est votre ami.",
        "Pour trouver une IP, vous pouvez `grep` pour un format d'IP comme `\"[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\"` dans les lignes d'erreur.",
        "Utilisez `head` ou `tail` avec `grep` pour examiner des portions de logs : `grep FATAL_ERROR appserver.log | head -n 5` (nécessite pipe `|` simulation).",
        "Le FLAG final se trouve dans `debug.log`."
    ],
    winCondition: ['find_debug_flag'],
};