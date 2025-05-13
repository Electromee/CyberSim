// missions_linux/linux_service_control.js
export const levelConfig = {
    id: 'linux_service_control',
    name: 'Contrôle des Services et Processus',
    category: 'Commandes Linux Avancées',
    description: 'Un processus nommé `resource_hogger` consomme trop de CPU. Identifiez son PID et "terminez-le". De plus, le service web (`nginx.service`) est arrêté et doit être "démarré". Le FLAG est dans un fichier de configuration qui devient lisible après le "démarrage" de Nginx.',
    initialState: {
        fileSystem: { /* ... minimal FS ... */ 
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'etc', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'nginx', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-x---', children: [ // Initially restricted
                        { name: 'nginx.conf', type: 'file', owner: 'root', group: 'root', permissions: '-r--------', content: 'FLAG{S3RVICE_M4N4G3R_PR0}\nworker_processes 1;' }
                    ]}
                ]},
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children:[
                    { name: 'sysop', type: 'directory', owner: 'sysop', group: 'operators', permissions: 'drwxr-xr-x', children:[] }
                ]}
            ]
        },
        session: {
            user: 'sysop',
            host: 'app-server-01',
            cwd: ['home', 'sysop'],
            home: ['home', 'sysop'],
            groups: ['operators', 'users'],
        },
        // We need to simulate processes and services for this level
        simulatedProcesses: [ // This is a new state property the sim-engine needs to manage
            { pid: 1, user: 'root', cpu: '0.1', mem: '0.5', command: 'systemd' },
            { pid: 123, user: 'sysop', cpu: '0.5', mem: '1.0', command: 'bash' },
            { pid: 456, user: 'root', cpu: '85.0', mem: '20.0', command: 'resource_hogger --config /opt/hog.conf' }, // The rogue process
            { pid: 457, user: 'dev', cpu: '2.0', mem: '5.0', command: '/usr/bin/python /opt/app/worker.py' },
            { pid: 789, user: 'www-data', cpu: '0.0', mem: '0.0', command: 'nginx: master process (initially stopped)'} // Nginx process, initially low CPU/Mem or marked as stopped
        ],
        simulatedServices: { // New state property
            'nginx.service': { status: 'inactive (dead)', description: 'A high performance web server' },
            'ssh.service': { status: 'active (running)', description: 'OpenBSD Secure Shell server' },
            'rogue.service': { status: 'active (running)', description: 'Unknown resource hogger linked to resource_hogger process' }
        }
    },
    objectives: [
        {
            id: 'identify_hogger_pid',
            description: 'Identifier le PID du processus `resource_hogger` en utilisant `ps` et `grep`.',
            check: (state, lastCommandOutput) => { // Requires passing last command output to checks
                // Simplistic: if 'kill_hogger' is done, they must have found PID.
                return state.objectivesCompleted.includes('kill_hogger');
            },
            message: 'PID du processus `resource_hogger` identifié !'
        },
        {
            id: 'kill_hogger',
            description: 'Utiliser `kill` (simulé) pour arrêter le processus `resource_hogger` (PID 456).',
            check: (state) => {
                // sim-engine's 'kill' command should modify simulatedProcesses
                const hogger = state.simulatedProcesses.find(p => p.command.includes('resource_hogger'));
                return !hogger || hogger.cpu === '0.0'; // Process removed or its CPU usage is now 0
            },
            message: 'Processus `resource_hogger` terminé avec succès !'
        },
        {
            id: 'start_nginx',
            description: 'Démarrer le service `nginx.service` en utilisant `systemctl start nginx.service` (simulé).',
            check: (state) => {
                return state.simulatedServices['nginx.service'] && state.simulatedServices['nginx.service'].status.includes('active (running)');
            },
            message: 'Service Nginx démarré !'
        },
        {
            id: 'read_nginx_conf_flag',
            description: 'Lire le fichier `/etc/nginx/nginx.conf` pour obtenir le FLAG.',
            check: (state) => {
                // Check if nginx is running AND file is read
                const nginxRunning = state.simulatedServices['nginx.service'] && state.simulatedServices['nginx.service'].status.includes('active (running)');
                const confRead = state.session.filesRead.includes('/etc/nginx/nginx.conf');
                // Also, the permissions on /etc/nginx might change when service starts
                const confNode = findNode(state.fileSystem, ['etc', 'nginx', 'nginx.conf']);
                const confReadable = confNode && checkPermissions(state.session.user, confNode, 'read');
                return nginxRunning && confRead && confReadable;
            },
            message: 'Configuration Nginx lue et FLAG sécurisé !'
        }
    ],
    hints: [
        "Utilisez `ps aux` ou `ps -ef` pour lister les processus.",
        "Filtrez la sortie de `ps` avec `grep`: `ps aux | grep resource_hogger` (nécessite pipe `|` simulation).",
        "Une fois le PID trouvé, utilisez `kill PID_DU_PROCESSUS`.",
        "Pour gérer les services, utilisez `systemctl status nom_service`, `systemctl start nom_service`.",
        "Les permissions du dossier `/etc/nginx` ou du fichier `nginx.conf` pourraient changer après le démarrage du service."
    ],
    winCondition: ['read_nginx_conf_flag'],
};