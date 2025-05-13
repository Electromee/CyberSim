// missions_linux/linux_file_hunt.js

export const levelConfig = {
    id: 'linux_file_hunt',
    name: 'La Chasse au Fichier',
    category: 'Commandes Linux Basiques',
    description: 'Un de nos analystes a laissé des fragments d\'un mot de passe important éparpillés dans plusieurs fichiers journaux. Votre mission est de retrouver le fichier contenant la mention "ALPHA_KEY" et d\'en extraire le FLAG.',
    initialState: {
        fileSystem: {
            name: '', 
            type: 'directory',
            permissions: 'drwxr-xr-x',
            children: [
                { 
                    name: 'var', type: 'directory', permissions: 'drwxr-xr-x', children: [
                        {
                            name: 'logs', type: 'directory', permissions: 'drwxr-xr-x', children: [
                                { name: 'system.log', type: 'file', permissions: '-rw-r--r--', content: 'System boot successful.\nUser login: admin\nWARNING: Disk space low.\nNetwork interface up.\n' },
                                { name: 'auth.log', type: 'file', permissions: '-rw-r--r--', content: 'Accepted publickey for user_ops from 10.0.0.5 port 22\nFailed password for invalid_user from 10.0.0.10\nUser account locked: attacker\n' },
                                { name: 'app_errors.log', type: 'file', permissions: '-rw-r--r--', content: 'ERROR: NullPointerException in MainProcess.\nINFO: Retrying connection...\nERROR: Database connection timeout.\n' },
                                { name: 'security_audit.log', type: 'file', permissions: '-rw-r--r--', content: 'Audit event: File access /etc/shadow by root.\nLogin attempt for user_data.\nCritical finding: Password fragment ALPHA_KEY discovered. FLAG{GR3P_FU_M45T3RY_UNL0CK3D}\nPolicy update scheduled.\n' },
                                { name: 'network_traffic.log', type: 'file', permissions: '-rw-r--r--', content: 'TCP 192.168.1.10:80 -> 10.0.5.2:54321 ESTABLISHED\nUDP 0.0.0.0:5353 -> 224.0.0.251:5353 IGMP\n' }
                            ]
                        }
                    ]
                },
                {
                    name: 'home', type: 'directory', permissions: 'drwxr-xr-x', children: [
                        { name: 'user', type: 'directory', permissions: 'drwxr-xr-x', children: [
                            { name: 'notes_on_logs.txt', type: 'file', permissions: '-rw-r--r--', content: 'Les journaux importants se trouvent dans /var/logs.\nIl faut que je vérifie le security_audit.log pour des anomalies.'}
                        ]}
                    ]
                }
            ]
        },
        session: {
            user: 'analyst',
            host: 'log-server',
            cwd: ['home', 'user'], 
            home: ['home', 'user']
        }
    },
    objectives: [
        {
            id: 'navigate_to_logs',
            description: 'Naviguer dans le répertoire `/var/logs`.',
            check: (state) => {
                // Check if current working directory is /var/logs
                const cwdString = '/' + state.session.cwd.filter(p => p).join('/');
                return cwdString === '/var/logs';
            },
            message: 'Vous êtes dans le bon répertoire pour analyser les journaux !'
        },
        {
            id: 'find_keyword_file',
            description: 'Identifier et lire le fichier journal contenant la chaîne "ALPHA_KEY".',
            // This objective is met when the correct file is `cat`ted.
            // The description guides them, but the check is on reading the specific file.
            check: (state) => {
                return state.session.filesRead.includes('/var/logs/security_audit.log');
            },
            message: 'Mot-clé trouvé ! Vous avez mis la main sur le bon fichier journal et le FLAG !'
        }
    ],
    hints: [
        "Les fichiers journaux sont souvent situés dans `/var/log` ou `/var/logs`.",
        "La commande `grep \"MOT_CLE\" nom_du_fichier` peut vous aider à chercher dans un fichier.",
        "Vous pouvez aussi utiliser `grep \"MOT_CLE\" *` pour chercher dans tous les fichiers du répertoire courant (attention, peut être long).",
        "Une fois le fichier identifié, utilisez `cat` pour lire son contenu complet."
    ],
    winCondition: ['find_keyword_file'],
};