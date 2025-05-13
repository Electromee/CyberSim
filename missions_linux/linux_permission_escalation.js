// missions_linux/linux_permission_escalation.js
export const levelConfig = {
    id: 'linux_permission_escalation',
    name: 'Escalade de Privilèges (Script)',
    category: 'Commandes Linux Avancées',
    description: 'Vous avez un accès utilisateur (`agentb`). Un script (`utility.sh`) dans votre dossier `/opt/custom_utils` vous appartient mais n\'est pas exécutable. S\'il était exécutable, il pourrait (simulé) lire des données sensibles. Rendez-le exécutable et exécutez-le pour obtenir le FLAG.',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'agentb', type: 'directory', owner: 'agentb', group: 'agents', permissions: 'drwxr-x---', children: [] }
                ]},
                { name: 'opt', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'custom_utils', type: 'directory', owner: 'agentb', group: 'agents', permissions: 'drwxr-xr-x', children: [
                        { 
                            name: 'utility.sh', type: 'file', owner: 'agentb', group: 'agents', 
                            permissions: '-rw-r--r--', // NOT executable by default for owner
                            content: '#!/bin/sh\necho "Utility script starting..."\n# If this script were really privileged, it would do something important here.\n# For simulation, if executable, it "reveals" the flag.\necho "Sensitive data access: FLAG{SCR1PT_K1DD13_PR1V1L3G3S}"\necho "Utility script finished."\n'
                        }
                    ]}
                ]},
                { name: 'root_data', type: 'directory', owner: 'root', group: 'root', permissions: 'drwx------', children:[
                    { name: 'secret_info.txt', type: 'file', owner: 'root', group: 'root', permissions: '-r--------', content: 'This is normally only readable by root.'}
                ]}
            ]
        },
        session: {
            user: 'agentb',
            host: 'target-box',
            cwd: ['home', 'agentb'],
            home: ['home', 'agentb'],
            groups: ['agents', 'users']
        }
    },
    objectives: [
        {
            id: 'find_script_dir',
            description: 'Naviguer vers le répertoire `/opt/custom_utils`.',
            check: (state) => state.session.cwd.join('/') === 'opt/custom_utils',
            message: 'Répertoire des utilitaires trouvé.'
        },
        {
            id: 'make_script_executable',
            description: 'Rendre le script `utility.sh` exécutable pour son propriétaire.',
            check: (state) => {
                const node = findNode(state.fileSystem, ['opt', 'custom_utils', 'utility.sh']);
                // Check if user execute bit is set for owner (perms[3])
                return node && node.permissions && node.permissions.length === 10 && node.permissions[3] === 'x';
            },
            message: 'Script rendu exécutable !'
        },
        {
            id: 'run_script_get_flag',
            description: 'Exécuter `./utility.sh` et observer sa sortie pour le FLAG.',
            // This is tricky. The "execution" is simulated.
            // We'll assume if they cat it *after* making it executable, they "ran" it.
            // Or, sim-engine could have a special `./filename` execution handler.
            // For now, if it's executable AND they cat it, objective met.
            check: (state) => {
                const node = findNode(state.fileSystem, ['opt', 'custom_utils', 'utility.sh']);
                const isExecutable = node && node.permissions && node.permissions.length === 10 && node.permissions[3] === 'x';
                const wasRead = state.session.filesRead.includes('/opt/custom_utils/utility.sh');
                return isExecutable && wasRead;
            },
            message: 'Script exécuté et FLAG obtenu !'
        }
    ],
    hints: [
        "Le script se trouve dans `/opt/custom_utils`.",
        "Utilisez `ls -l utility.sh` pour voir ses permissions actuelles.",
        "La commande `chmod u+x utility.sh` rendra le script exécutable pour vous (l'utilisateur propriétaire).",
        "Pour exécuter un script dans le dossier courant, tapez `./utility.sh`.",
        "Dans cette simulation, lire le script avec `cat` après l'avoir rendu exécutable compte comme son exécution."
    ],
    winCondition: ['run_script_get_flag'],
};