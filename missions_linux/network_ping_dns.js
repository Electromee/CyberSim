// missions_linux/network_ping_dns.js

export const levelConfig = {
    id: 'network_ping_dns',
    name: 'Net 2: Diagnostic Connectivité et DNS',
    category: 'Réseau',
    description: 'Des utilisateurs signalent des problèmes d\'accès à des sites externes et internes. Votre mission est de vérifier la connectivité de base vers un serveur externe connu (dns.google) et un serveur interne (fileserver.internal.lan), puis de vérifier que la résolution DNS fonctionne pour "example.com".',
    initialState: {
        fileSystem: {
            name: '', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                { name: 'home', type: 'directory', owner: 'root', group: 'root', permissions: 'drwxr-xr-x', children: [
                    { name: 'netadmin', type: 'directory', owner: 'netadmin', group: 'netadmins', permissions: 'drwxr-xr-x', children: [
                        { name: 'troubleshooting_guide.txt', type: 'file', owner: 'netadmin', group: 'netadmins', permissions: '-rw-r--r--', content: 'Étapes de diagnostic réseau :\n1. Vérifier la connectivité à une cible externe fiable (ex: dns.google).\n2. Vérifier la connectivité à une cible interne (ex: fileserver.internal.lan).\n3. Vérifier la résolution DNS (ex: example.com).\n' }
                    ]}
                ]}
            ]
        },
        session: {
            user: 'netadmin',
            host: 'diag-station',
            cwd: ['home', 'netadmin'],
            home: ['home', 'netadmin'],
            groups: ['netadmins', 'users']
        },
        networkState: {
            hosts: {
                'diag-station': {
                    ips: ['192.168.1.20'],
                    openPorts: []
                },
                'dns.google': { // External reliable host
                    ips: ['8.8.8.8'],
                    domainNames: ['dns.google'],
                    openPorts: [{ port: 53, service: 'dns' }] // For nslookup/dig
                },
                'fileserver.internal.lan': {
                    ips: ['192.168.1.150'],
                    domainNames: ['fileserver.internal.lan'],
                    openPorts: [{ port: 22, service: 'ssh' }] // Just needs to be pingable
                },
                // A simulated DNS server that can resolve example.com
                'localdns.internal.lan': {
                    ips: ['192.168.1.1'], // Often the gateway is also a DNS forwarder
                    domainNames: ['localdns.internal.lan'],
                    openPorts: [{port: 53, service: 'dns'}],
                    dnsRecords: { // Simplified DNS records for simulation
                        'example.com': { A: '93.184.216.34' },
                        'www.example.com': { CNAME: 'example.com' },
                        'fileserver.internal.lan': { A: '192.168.1.150'},
                        'dns.google': { A: '8.8.8.8'}
                    }
                }
            },
            dnsServers: ['192.168.1.1'], // User's machine uses this DNS
            defaultGateway: '192.168.1.1'
        }
    },
    objectives: [
        {
            id: 'ping_external',
            description: 'Vérifier la connectivité à `dns.google` en utilisant la commande `ping`.',
            check: (state, lastCommandOutput) => {
                return lastCommandOutput &&
                       lastCommandOutput.includes('ping statistics for 8.8.8.8') && // IP of dns.google
                       lastCommandOutput.includes('packets transmitted,') &&
                       lastCommandOutput.includes('received,');
            },
            message: 'Connectivité vers dns.google (externe) confirmée !'
        },
        {
            id: 'ping_internal',
            description: 'Vérifier la connectivité à `fileserver.internal.lan` en utilisant la commande `ping`.',
            check: (state, lastCommandOutput) => {
                return lastCommandOutput &&
                       lastCommandOutput.includes('ping statistics for 192.168.1.150') && // IP of fileserver.internal.lan
                       lastCommandOutput.includes('packets transmitted,') &&
                       lastCommandOutput.includes('received,');
            },
            message: 'Connectivité vers fileserver.internal.lan (interne) confirmée !'
        },
        {
            id: 'dns_resolve_example',
            description: 'Résoudre le nom de domaine `example.com` en utilisant `nslookup` ou `dig`.',
            check: (state, lastCommandOutput) => {
                const resolvedSuccessfully = lastCommandOutput &&
                                           (lastCommandOutput.includes('Server:\t\t192.168.1.1') || lastCommandOutput.includes(';; SERVER: 192.168.1.1#53')) && // nslookup or dig server
                                           lastCommandOutput.includes('Name:\texample.com') &&
                                           lastCommandOutput.includes('Address: 93.184.216.34'); // Correct IP for example.com
                const digResolved = lastCommandOutput && 
                                    lastCommandOutput.includes(';; ANSWER SECTION:') &&
                                    lastCommandOutput.includes('example.com.') &&
                                    lastCommandOutput.includes('A\t93.184.216.34');
                return resolvedSuccessfully || digResolved;
            },
            message: 'Résolution DNS pour example.com réussie !'
        }
    ],
    hints: [
        "Utilisez `ping <hostname_ou_ip>` pour tester la connectivité.",
        "Par défaut, `ping` envoie des paquets en continu. Utilisez `ping -c 4 <cible>` pour envoyer 4 paquets.",
        "Utilisez `nslookup <nom_de_domaine>` pour interroger les serveurs DNS.",
        "Alternativement, `dig <nom_de_domaine>` peut aussi être utilisé pour la résolution DNS.",
        "Assurez-vous que votre station a un serveur DNS configuré (c'est géré par la simulation)."
    ],
    winCondition: ['ping_external', 'ping_internal', 'dns_resolve_example']
};