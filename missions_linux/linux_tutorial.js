// missions_linux/linux_tutorial.js
export const levelConfig = {
    id: 'linux_tutorial',
    name: 'Tutoriel Linux',
    category: 'Commandes Linux Basiques',
    description: 'Bienvenue au tutoriel ! Apprenez les commandes `ls`, `cd`, et `cat`. Votre but est de lire le fichier `instructions.txt`.',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', owner: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'tutorial_user', type: 'directory', owner: 'tutorial_user', permissions: 'drwxr-xr-x', children: [
                        { name: 'documents', type: 'directory', owner: 'tutorial_user', permissions: 'drwxr-xr-x', children: [
                             { name: 'instructions.txt', type: 'file', owner: 'tutorial_user', permissions: '-rw-r--r--', content: 'FLAG{TUT0R14L_C0MPL3T3D}\nBravo ! Utilisez `ls` pour lister, `cd <dossier>` pour naviguer, `cd ..` pour remonter, et `cat <fichier>` pour lire.' }
                        ]},
                        { name: 'empty_folder', type: 'directory', owner: 'tutorial_user', permissions: 'drwxr-xr-x', children: [] }
                    ]}
                ]}
            ]
        },
        session: {
            user: 'tutorial_user',
            host: 'learn-box',
            cwd: ['home', 'tutorial_user'],
            home: ['home', 'tutorial_user']
        }
    },
    objectives: [
        { id: 'navigate_docs', description: 'Naviguer dans le dossier `documents`.', 
          check: (state) => state.session.cwd.join('/') === 'home/tutorial_user/documents', 
          message: 'Bien ! Vous êtes dans le dossier des documents.' },
        { id: 'read_instructions', description: 'Lire le fichier `instructions.txt`.', 
          check: (state) => state.session.filesRead.includes('/home/tutorial_user/documents/instructions.txt'), 
          message: 'Instructions lues ! Vous maîtrisez les bases.' }
    ],
    hints: ["Utilisez `ls` pour voir le contenu du dossier actuel.", "Tapez `cd documents` pour entrer dans le dossier.", "Utilisez `cat instructions.txt` pour lire le fichier."],
    winCondition: ['read_instructions'],
};