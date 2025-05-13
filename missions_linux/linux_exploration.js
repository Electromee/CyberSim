// levels/linux_exploration.js

// Configuration spécifique pour la mission Linux 1: Exploration Fichiers
export const levelConfig = {
    id: 'linux_exploration',
    name: 'Exploration Fichiers',
    category: 'Commandes Linux Basiques',
    description: 'Bienvenue dans votre première mission Linux ! Votre objectif est de trouver et d\'afficher le contenu d\'un fichier secret qui contient la phrase magique (le "FLAG"). Naviguez dans le système de fichiers et utilisez les commandes que vous connaissez pour le découvrir.',
    initialState: {
        // Décrit l'état initial du système simulé pour ce niveau
        fileSystem: {
            name: '', // Racine
            type: 'directory',
            permissions: 'drwxr-xr-x',
            children: [
                { name: 'home', type: 'directory', permissions: 'drwxr-xr-x', children: [
                    { name: 'user', type: 'directory', permissions: 'drwxr-xr-x', children: [
                        { name: 'documents', type: 'directory', permissions: 'drwxr-xr-x', children: [
                             { name: 'notes.txt', type: 'file', permissions: '-rw-r--r--', content: 'Quelques notes...\nRien d\'important ici.\n' }
                        ]},
                        { name: 'desktop', type: 'directory', permissions: 'drwxr-xr-x', children: [] },
                        { name: 'important_file.txt', type: 'file', permissions: '-r--------', content: 'Ce fichier semble important, mais je ne peux pas le lire...\n' }, // Fichier non lisible par 'user'
                        { name: '.hidden_dir', type: 'directory', permissions: 'drwxr-x---', children: [
                             { name: 'secret_data', type: 'directory', permissions: 'drwxr-x---', children: [
                                  { name: 'phrase_secrete.txt', type: 'file', permissions: '-r--r--r--', content: 'Le FLAG est : FLAG{premiere_extraction_reussie}\nContinuez comme ca !\n' } // Le fichier cible
                             ]}
                        ]}
                    ]}
                ]},
                { name: 'var', type: 'directory', permissions: 'drwxr-xr-x', children: [
                    { name: 'log', type: 'directory', permissions: 'drwxr-xr-x', children: [] }
                ]},
                 { name: 'etc', type: 'directory', permissions: 'drwxr-xr-x', children: [
                     { name: 'passwd', type: 'file', permissions: '-rw-r--r--', content: 'root:x:0:0:root:/root:/bin/bash\nuser:x:1000:1000:user:/home/user:/bin/bash\n' }
                 ]}
                // Moins de dossiers qu'auparavant pour ce niveau d'intro
            ]
        },
        // initialNetworkState: { ... }, // Si le niveau implique du réseau
        session: {
            user: 'user',
            host: 'local',
            cwd: ['home', 'user'], // Commence dans le répertoire utilisateur
        }
    },
    objectives: [
        // Objectifs pour ce niveau
        {
            id: 'find_flag_file',
            description: 'Trouver le fichier contenant le FLAG.',
            // Cet objectif est atteint quand l'utilisateur tente de lire le fichier
            check: (state) => {
                 // Vérifie si le fichier cible est dans la liste des fichiers lus
                 return state.session.filesRead.includes('/home/user/.hidden_dir/secret_data/phrase_secrete.txt');
            },
            message: 'Vous avez trouvé le fichier secret !' // Message quand cet objectif est atteint
        },
         {
             id: 'extract_flag',
             description: 'Afficher le contenu du fichier secret.',
              // Cet objectif est atteint en même temps que le précédent avec cette logique simple
              // Pour plus de réalisme, on pourrait chercher la chaîne "FLAG{" dans la sortie récemment affichée
              // Ou introduire une commande `grep` simulée.
              // Pour l'instant, on lie juste l'extraction à la lecture du fichier.
             check: (state) => {
                 return state.session.filesRead.includes('/home/user/.hidden_dir/secret_data/phrase_secrete.txt');
             },
              message: 'Le FLAG a été extrait ! Mission accomplie !' // Message quand cet objectif est atteint
         }
    ],
    winCondition: ['extract_flag'], // Le niveau est gagné quand l'objectif 'extract_flag' est complété
};