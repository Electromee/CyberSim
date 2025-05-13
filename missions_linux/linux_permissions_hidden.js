// missions_linux/linux_permissions_hidden.js

export const levelConfig = {
    id: 'linux_permissions_hidden',
    name: 'Secrets et Permissions',
    category: 'Commandes Linux Basiques',
    description: 'Agent, des informations cruciales sont cachées à la vue de tous. Vous devez découvrir un fichier dissimulé et lire son contenu. Faites attention aux permissions, tout n\'est pas toujours accessible du premier coup.',
    initialState: {
        fileSystem: {
            name: '', // Racine
            type: 'directory',
            permissions: 'drwxr-xr-x',
            owner: 'root',
            group: 'root',
            children: [
                { 
                    name: 'home', type: 'directory', permissions: 'drwxr-xr-x', owner: 'root', group: 'root', children: [
                        { 
                            name: 'agent_x', type: 'directory', permissions: 'drwxr-x---', owner: 'agent_x', group: 'agents',
                            children: [
                                { 
                                    name: 'work_documents', 
                                    type: 'directory', 
                                    permissions: 'drwxr-xr-x', 
                                    owner: 'agent_x', 
                                    group: 'agents',
                                    children: [
                                        { name: 'report_draft.txt', type: 'file', permissions: '-rw-r--r--', owner: 'agent_x', group: 'agents', content: 'Brouillon de rapport. RAS.' }
                                    ]
                                },
                                { 
                                    name: '.secret_stash', // Hidden directory
                                    type: 'directory', 
                                    permissions: 'drwx------', // Only owner (agent_x) can rwx
                                    owner: 'agent_x', 
                                    group: 'agents',
                                    children: [
                                        { 
                                            name: 'intel.txt', 
                                            type: 'file', 
                                            // Owner is root, group is root, but 'others' can read!
                                            permissions: '-r--r--r--', // root can read, group root can read, OTHERS can read
                                            owner: 'root', 
                                            group: 'root', 
                                            content: 'FLAG{H1DD3N_N0_M0R3_P3RM15510NS_M45T3R3D}\nCette information est top secrète. Bien joué de l\'avoir lue malgré les apparences.' 
                                        },
                                        { 
                                            name: 'access_codes.txt', 
                                            type: 'file', 
                                            permissions: '-rw-------', // Only agent_x can read/write
                                            owner: 'agent_x', 
                                            group: 'agents',
                                            content: 'Ceci est un leurre. Le vrai drapeau est dans intel.txt.\nRegardez bien les permissions de ce fichier intel.txt ; même s\'il appartient à root, qui d\'autre peut le lire ?' 
                                        }
                                    ]
                                },
                                { 
                                    name: 'readme.txt', 
                                    type: 'file', 
                                    permissions: '-rw-r--r--', 
                                    owner: 'agent_x', 
                                    group: 'agents',
                                    content: 'Bienvenue agent_x.\nVos fichiers importants sont sécurisés.\nUtilisez `ls -a` pour voir tous les fichiers, même cachés.\n'
                                }
                            ]
                        }
                    ]
                },
                {
                    name: 'tmp', 
                    type: 'directory', 
                    permissions: 'drwxrwxrwt', // Sticky bit often on /tmp
                    owner: 'root',
                    group: 'root',
                    children: [
                        { name: 'tempfile.tmp', type: 'file', permissions: '-rw-r--r--', owner: 'agent_x', group: 'agents', content: 'Fichier temporaire sans importance.'}
                    ]
                }
            ]
        },
        session: {
            user: 'agent_x', // User for this mission
            host: 'secure-server',
            cwd: ['home', 'agent_x'], 
            home: ['home', 'agent_x'],
            groups: ['agents', 'users'] // User agent_x is in 'agents' and 'users' group
        }
    },
    objectives: [
        {
            id: 'find_hidden_stash',
            description: 'Découvrir et entrer dans le répertoire secret ".secret_stash".',
            check: (state) => {
                // Objective met if user's CWD is /home/agent_x/.secret_stash
                const cwdString = '/' + state.session.cwd.filter(p => p).join('/');
                return cwdString === '/home/agent_x/.secret_stash';
            },
            message: 'Excellent ! Vous avez localisé et accédé au répertoire secret.'
        },
        {
            id: 'read_intel',
            description: 'Lire le fichier "intel.txt" qui se trouve dans le ".secret_stash".',
            check: (state) => {
                return state.session.filesRead.includes('/home/agent_x/.secret_stash/intel.txt');
            },
            message: 'Information critique obtenue ! Le FLAG est à vous.'
        }
    ],
    hints: [
        "Les fichiers et dossiers commençant par un '.' sont cachés par défaut.",
        "Utilisez `ls -a` pour voir tous les fichiers et dossiers.",
        "La commande `cd nom_du_dossier` permet de changer de répertoire.",
        "Analysez les permissions de `intel.txt` avec `ls -l`. Qui a le droit de le lire ?",
        "Même si un fichier appartient à 'root', si les permissions 'autres' (others) le permettent, vous pourriez y accéder."
    ],
    winCondition: ['read_intel'], // Player wins when they read intel.txt
};