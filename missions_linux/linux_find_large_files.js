// missions_linux/linux_find_large_files.js
export const levelConfig = {
    id: 'linux_find_large_files',
    name: 'Chasse aux Gros Fichiers',
    category: 'Commandes Linux Avancées',
    description: 'L\'espace disque du serveur est presque plein ! Vous devez inspecter le dossier `/home/data_hoarder` pour identifier les fichiers de plus de 50KB (simulé) et trouver un fichier spécifique nommé `archive_MAY2023.zip` qui est suspecté d\'être très volumineux. Le FLAG est dans un petit fichier `notes_cleanup.txt`.',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'data_hoarder', type: 'directory', owner: 'data_hoarder', group: 'users', permissions: 'drwxr-xr-x', children: [
                        { name: 'project_alpha', type: 'directory', owner: 'data_hoarder', group: 'users', permissions: 'drwxr-xr-x', children: [
                            { name: 'dataset1.dat', type: 'file', owner: 'data_hoarder', permissions: '-rw-r--r--', content: 'A'.repeat(60 * 1024) }, // 60KB
                            { name: 'small_config.conf', type: 'file', owner: 'data_hoarder', permissions: '-rw-r--r--', content: 'config_value=true' },
                        ]},
                        { name: 'old_backups', type: 'directory', owner: 'data_hoarder', group: 'users', permissions: 'drwxr-xr-x', children: [
                            { name: 'archive_JAN2023.zip', type: 'file', owner: 'data_hoarder', permissions: '-rw-r--r--', content: 'B'.repeat(10 * 1024) }, // 10KB
                            { name: 'archive_MAY2023.zip', type: 'file', owner: 'data_hoarder', permissions: '-rw-r--r--', content: 'C'.repeat(150 * 1024) }, // 150KB - Target
                        ]},
                        { name: 'videos', type: 'directory', owner: 'data_hoarder', group: 'users', permissions: 'drwxr-xr-x', children: [
                            { name: 'tutorial.mp4', type: 'file', owner: 'data_hoarder', permissions: '-rw-r--r--', content: 'D'.repeat(75 * 1024) }, // 75KB
                        ]},
                        { name: 'notes_cleanup.txt', type: 'file', owner: 'data_hoarder', permissions: '-rw-r--r--', content: 'FLAG{D1SK_SP4C3_SAVVY_INVESTIGATOR}\nRemember to check sizes with `ls -lh` or `du -sh`.' },
                    ]},
                    { name: 'admin', type: 'directory', owner: 'admin', group: 'admins', permissions: 'drwxr-xr-x', children: []}
                ]}
            ]
        },
        session: {
            user: 'admin', // Admin doing the cleanup
            host: 'storage-server',
            cwd: ['home', 'admin'],
            home: ['home', 'admin'],
            groups: ['admins', 'users']
        }
    },
    objectives: [
        {
            id: 'goto_hoarder_home',
            description: 'Se déplacer dans le répertoire `/home/data_hoarder`.',
            check: (state) => state.session.cwd.join('/') === 'home/data_hoarder',
            message: 'Vous êtes prêt à inspecter les fichiers de data_hoarder.'
        },
        {
            id: 'identify_large_zip',
            description: 'Identifier le fichier `archive_MAY2023.zip` comme étant volumineux (plus de 100KB).',
            // Check if user lists this specific file with -lh or uses du on it, or cats notes_cleanup.txt (which is the win)
            // For now, we tie it to getting the flag.
            check: (state) => state.session.filesRead.includes('/home/data_hoarder/notes_cleanup.txt'),
            message: 'Gros fichier ZIP identifié ! C\'est un bon candidat pour une investigation.'
        },
        {
            id: 'get_cleanup_notes_flag',
            description: 'Lire le fichier `notes_cleanup.txt` pour obtenir le FLAG.',
            check: (state) => state.session.filesRead.includes('/home/data_hoarder/notes_cleanup.txt'),
            message: 'Notes de nettoyage trouvées et FLAG obtenu !'
        }
    ],
    hints: [
        "Le répertoire à inspecter est `/home/data_hoarder`.",
        "Utilisez `ls -lh` pour voir les tailles des fichiers de manière lisible.",
        "La commande `du -sh nom_fichier_ou_dossier` montre la taille totale.",
        "Pour trouver des fichiers par nom : `find . -name \"archive_*.zip\"` (depuis `/home/data_hoarder`).",
        "Pour trouver des fichiers par taille (plus de 50KB, simulé) : `find . -size +50k` (nécessite implémentation de `-size` dans `find`)."
    ],
    winCondition: ['get_cleanup_notes_flag'],
};