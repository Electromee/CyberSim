// missions_linux/linux_archive_hunt.js
export const levelConfig = {
    id: 'linux_archive_hunt',
    name: 'Chasse à l\'Archive Perdue',
    category: 'Commandes Linux Avancées',
    description: 'Un document vital, `project_specs.txt`, a été archivé dans `research_data.tar.gz` (ou `.zip`) et égaré dans la structure de dossiers sous `/data/deep_archive/`. Trouvez l\'archive, "extrayez" son contenu (un dossier `research_docs` sera créé à côté de l\'archive), puis trouvez le FLAG à l\'intérieur de `project_specs.txt`.',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'data', type: 'directory', owner: 'researcher', group: 'research', permissions: 'drwxr-xr-x', children: [
                    { name: 'deep_archive', type: 'directory', owner: 'researcher', group: 'research', permissions: 'drwxr-xr-x', children: [
                        { name: 'folder_A', type: 'directory', owner: 'researcher', permissions: 'drwxr-xr-x', children: [
                             { name: 'misc', type: 'directory', owner: 'researcher', permissions: 'drwxr-xr-x', children: [
                                { name: 'research_data.tar.gz', type: 'file', owner: 'researcher', permissions: '-rw-r--r--', content: 'ARCHIVED_DATA_SIMULATION_TAR_GZ' } // Actual content isn't extracted by cat
                             ]}
                        ]},
                        { name: 'folder_B', type: 'directory', owner: 'researcher', permissions: 'drwxr-xr-x', children: [] },
                        // research_docs will be "created" here by simulated tar/zip extraction
                    ]}
                ]},
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children:[
                    { name: 'researcher', type: 'directory', owner: 'researcher', group: 'research', permissions: 'drwxr-xr-x', children:[]}
                ]}
            ]
        },
        session: {
            user: 'researcher',
            host: 'archive-srv',
            cwd: ['home', 'researcher'],
            home: ['home', 'researcher'],
            groups: ['research', 'users']
        },
        // We need to store what the archive contains for the simulation
        simulatedArchives: {
            '/data/deep_archive/folder_A/misc/research_data.tar.gz': {
                extractionDirName: 'research_docs', // Name of dir created upon extraction
                contains: [ // Files and folders inside the archive
                    { name: 'project_specs.txt', type: 'file', permissions: '-rw-r--r--', owner: 'researcher', content: 'Project Specifications\nVersion: 3.1\nKey Requirement: Performance\nFLAG: FLAG{ARCH1V3_EXPLORER_EXTRA0RDINAIRE}\nContact: admin@example.com' },
                    { name: 'notes.md', type: 'file', permissions: '-rw-r--r--', owner: 'researcher', content: '# Research Notes\n- Point A\n- Point B' },
                    { name: 'images', type: 'directory', permissions: 'drwxr-xr-x', owner: 'researcher', children: [
                        { name: 'diagram.png', type: 'file', permissions: '-rw-r--r--', owner: 'researcher', content: 'simulated_png_data' }
                    ]}
                ]
            }
        }
    },
    objectives: [
        {
            id: 'find_archive',
            description: 'Trouver le fichier `research_data.tar.gz` dans `/data/deep_archive/`.',
            check: (state) => {
                // Check if CWD is where the archive is, or if find command was used to locate it.
                // For simplicity, assume if they "extract" it, they found it.
                return state.objectivesCompleted.includes('extract_archive');
            },
            message: 'Archive localisée !'
        },
        {
            id: 'extract_archive',
            description: '"Extraire" l\'archive `research_data.tar.gz` (par ex. avec `tar -xzf research_data.tar.gz`). Un dossier `research_docs` devrait apparaître.',
            check: (state) => {
                // Check if the 'research_docs' directory now exists at the expected location
                const archiveParentPath = ['data', 'deep_archive', 'folder_A', 'misc'];
                const extractedDirPath = [...archiveParentPath, 'research_docs'];
                return !!findNode(state.fileSystem, extractedDirPath);
            },
            message: 'Archive extraite ! Le contenu est maintenant accessible.'
        },
        {
            id: 'get_flag_from_specs',
            description: 'Lire le fichier `project_specs.txt` dans le dossier extrait et trouver le FLAG.',
            check: (state) => {
                // Path to the extracted file
                const specFilePath = '/data/deep_archive/folder_A/misc/research_docs/project_specs.txt';
                return state.session.filesRead.includes(specFilePath);
            },
            message: 'Spécifications lues et FLAG découvert !'
        }
    ],
    hints: [
        "L'archive est quelque part sous `/data/deep_archive/`.",
        "Utilisez `find /data/deep_archive -name research_data.tar.gz` pour la localiser.",
        "Une fois trouvée, naviguez vers son répertoire.",
        "Pour \"'extrait'\" une archive .tar.gz (simulé): `tar -xzf research_data.tar.gz`.",
        "Le contenu sera \"'extrait'\" dans un nouveau dossier nommé `research_docs` au même endroit que l'archive.",
        "Le FLAG est dans `project_specs.txt` à l'intérieur de `research_docs`.",
    ],
    winCondition: ['get_flag_from_specs'],
};