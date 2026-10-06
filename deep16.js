EXTRA(16, "How networks are layered: OSI and TCP/IP", {
  deep: [
    "Follow one packet to see the layers work. The IP header carries the source and destination IP address, and these stay the same for the whole trip (unless NAT changes them). The Ethernet header carries MAC addresses, and these are valid only for one hop. Every router removes the old Ethernet header, lowers the TTL number in the IP header by one, and adds a new Ethernet header for the next hop. So the IP address says where the packet finally goes, and the MAC address says who gets it next.",
    "To send a frame, a machine must know the MAC address of the next hop. ARP (Address Resolution Protocol) finds it. The machine broadcasts a question to the local network: 'who has 10.0.1.5?'. The owner answers with its MAC address, and the answer is kept in the ARP cache for a short time. If the destination is in another subnet, the machine asks for the MAC of the default gateway instead. ARP works only inside one local network; it never crosses a router.",
    "Each link has an MTU (maximum transmission unit), the largest packet it can carry; for Ethernet it is 1500 bytes. With 20 bytes of IP header and 20 bytes of TCP header, 1460 bytes are left for data in one segment (the MSS). A packet that is too big for the next link is either cut into fragments or, if it has the 'do not fragment' flag, dropped while the router sends back an ICMP message. If a firewall blocks that ICMP message, small requests work and large transfers hang. Tunnels and VPNs add their own headers, so they lower the usable MTU. One misconception: the layers are a model for thinking, not a strict law. TLS, for example, does not fit cleanly into one OSI layer."
  ],
  iq: [
    { q: "Why do we need both a MAC address and an IP address?", a: "They do different jobs. An IP address is a logical address that shows which network a machine is in, so routers can forward a packet across the world. A MAC address identifies a network card on the local link and is used only to hand the frame to the next device. During a trip the IP addresses stay the same, but the MAC addresses change at every router." },
    { q: "What is ARP and when is it used?", a: "ARP translates an IP address into a MAC address inside the local network. Before a machine sends to an IP in its own subnet, it broadcasts 'who has this IP?' and stores the answer in its ARP cache. For a destination outside the subnet it does the same for the gateway's IP. An incomplete or failed ARP entry means a layer 2 problem: wrong VLAN, cable, or the target is down.", c: `
ip neigh              # Linux: the ARP cache (REACHABLE, STALE, FAILED)
arp -a                # Windows and macOS
` },
    { q: "At which layer do these work: ping, a switch, a router, TCP ports, HTTP?", a: "ping uses ICMP, which belongs to layer 3; it has no ports, so 'ping port 80' makes no sense. A switch forwards frames by MAC address at layer 2. A router forwards packets by IP address at layer 3. Ports belong to TCP and UDP at layer 4. HTTP is layer 7. Interviewers ask this to see if you can match a symptom to the layer where the fault is." },
    { q: "Over a VPN, small requests work but large uploads or big API responses hang. What do you suspect?", a: "An MTU problem. The VPN adds headers, so full-size 1500-byte packets no longer fit. They are dropped, and the ICMP message that should tell the sender to use smaller packets is blocked by a firewall. Test with ping using the 'do not fragment' flag and different sizes, then lower the MTU on the tunnel or enable MSS clamping.", c: `
ping -M do -s 1472 api.example.com    # Linux: 1472 + 28 bytes of headers = 1500
ping -M do -s 1372 api.example.com    # if only the smaller size works, MTU is the problem
ping -f -l 1472 api.example.com       # Windows form
` }
  ],
  tips: [
    "When you report a network problem, name the layer and the proof: 'DNS resolves, ping works, TCP 443 times out'. This one sentence tells the network team where to look.",
    "'ip -s link' shows error and drop counters per interface. Numbers that keep growing point to a bad cable, a bad port or a full queue, long before anyone looks at the application.",
    "Two machines with the same IP address give random, on-and-off failures. Check with 'ip neigh' from a third machine: if the MAC for that IP keeps changing, you have a duplicate address.",
    "See the MTU of every interface with 'ip link'. Docker, Kubernetes overlays and VPNs often need a lower value than 1500, and a wrong value shows up as hanging large transfers."
  ]
});

EXTRA(16, "IP addresses, subnets and CIDR", {
  deep: [
    "A machine uses its subnet mask for one decision. It does a bitwise AND of its own address with the mask, and of the destination address with the mask. If the two results are equal, the destination is local: it uses ARP and sends directly. If not, it sends the packet to the default gateway. With a wrong mask the machine makes this decision wrongly, so it can reach some hosts but not others, which is very confusing to debug.",
    "Routers choose a route with the longest prefix match. If a routing table has 10.0.0.0/8, 10.1.0.0/16 and the default route 0.0.0.0/0, a packet to 10.1.2.3 uses the /16 route because it is the most specific. The default route matches everything and is used only when nothing better matches. Cloud route tables, VPNs and Kubernetes all work by this rule.",
    "You can do subnet maths in your head. For a /26, the mask is 255.255.255.192; 256 minus 192 is 64, so the subnets start at .0, .64, .128 and .192, each with 64 addresses and 62 usable hosts. Know some special ranges too: 169.254.0.0/16 is link-local, which a machine gives itself when DHCP fails; 127.0.0.0/8 is all loopback, not only 127.0.0.1; 100.64.0.0/10 is used by providers for carrier-grade NAT. In cloud networks the provider reserves some addresses in every subnet (AWS reserves five), so a /28 there gives 11 usable hosts, not 14."
  ],
  iq: [
    { q: "How many hosts fit in a /26, and what is its subnet mask?", a: "32 minus 26 leaves 6 host bits, and 2 to the power 6 is 64 addresses. Two are not usable for hosts, the network address and the broadcast address, so 62 hosts. The mask has 26 one-bits: 255.255.255.192. The four /26 subnets inside a /24 start at .0, .64, .128 and .192.", c: `
import ipaddress
net = ipaddress.ip_network("192.168.1.64/26")
print(net.netmask)              # 255.255.255.192
print(net.num_addresses - 2)    # 62
print(net[1], net[-2])          # 192.168.1.65 192.168.1.126  (first and last host)
print(net.broadcast_address)    # 192.168.1.127
` },
    { q: "Are 10.0.1.200 and 10.0.2.5 in the same subnet if the prefix is /23? And with /22?", a: "With /23 they are not: a /23 covers two values of the third number, starting at an even one, so 10.0.0.0/23 holds 10.0.0.x and 10.0.1.x, and 10.0.2.5 is in the next subnet, 10.0.2.0/23. With /22 they are, because 10.0.0.0/22 covers 10.0.0.0 to 10.0.3.255. The method is always the same: apply the mask to both addresses and compare the network parts.", c: `
import ipaddress
a = ipaddress.ip_interface("10.0.1.200/23").network
b = ipaddress.ip_interface("10.0.2.5/23").network
print(a, b, a == b)     # 10.0.0.0/23 10.0.2.0/23 False
` },
    { q: "An application in a Docker container listens on 127.0.0.1:8000. The port is published, but nobody can connect. Why?", a: "127.0.0.1 is the loopback interface, and each container has its own. A server bound to it accepts connections only from inside the same container. Docker forwards traffic to the container's network interface, where nothing is listening. Bind the server to 0.0.0.0, which means all interfaces." },
    { q: "A machine shows the address 169.254.x.x. What does that tell you?", a: "It asked for an address with DHCP and got no answer, so it gave itself a link-local address. With it, the machine can talk only to neighbours on the same link and has no gateway. Check the cable or Wi-Fi, the VLAN, and whether the DHCP server is running and still has free addresses. (In clouds, the single address 169.254.169.254 is different: it is the instance metadata service.)" }
  ],
  tips: [
    "Plan address ranges so that networks never overlap: for example 10.10.0.0/16 for dev, 10.20.0.0/16 for prod, and something else for the office. Overlapping ranges cannot be joined later by VPN or peering without painful renumbering.",
    "'ip route get 10.0.3.15' shows exactly which interface, gateway and source address the kernel will use for that destination. It ends guessing when a machine has several network cards or a VPN.",
    "Docker uses 172.17.0.0/16 by default. If your company network uses the same range, containers cannot reach those servers; change the range with the 'bip' and 'default-address-pools' settings in /etc/docker/daemon.json.",
    "Make subnets bigger than you need today. A subnet cannot easily be resized later, and Kubernetes or autoscaling can use hundreds of addresses quickly."
  ]
});

EXTRA(16, "DNS: names to addresses", {
  deep: [
    "A lookup passes several caches before it reaches a real DNS server. The browser has its own cache. The operating system checks the hosts file and its own cache. Then the question goes to the recursive resolver, which also caches. Each cache keeps the answer for the TTL. That is why a change can be visible on one machine and not on another, and why you can clear only your own caches, not the caches of your users.",
    "There are two kinds of query. Your computer sends a recursive query: 'give me the final answer'. The resolver then does iterative queries itself: it asks a root server, gets a referral to the servers of the top-level domain, asks them, gets a referral to the authoritative servers of the domain, and asks those. Negative answers are cached too. If you look up a name before its record exists, the answer 'no such name' is remembered for a while, and the new record seems not to work.",
    "DNS uses UDP port 53 because a lookup is one small question and one small answer; a TCP handshake would cost more than the lookup itself. When the answer is too large for one UDP packet, the server sets a 'truncated' flag and the client asks again over TCP port 53. Zone transfers between servers also use TCP. So a firewall must allow both. Two more facts: a CNAME cannot exist together with other records for the same name, so it is not allowed at the top of a domain; and several A records for one name spread traffic a little but do not check health, so this is not real load balancing."
  ],
  iq: [
    { q: "Why does DNS use UDP, and when does it use TCP?", a: "A DNS lookup is one small request and one small reply, so UDP avoids the cost of a connection handshake; if a packet is lost, the client simply asks again. TCP is used when the answer does not fit in one UDP packet (the reply comes back marked as truncated and the client retries over TCP), and for zone transfers. Newer encrypted forms, DNS over TLS and DNS over HTTPS, also run on TCP." },
    { q: "You changed an A record, but some users still reach the old server. Why, and what can you do?", a: "Resolvers and operating systems that looked up the name before the change keep the old answer until its TTL ends. You cannot clear other people's caches. The right method is to lower the TTL well before the change, keep the old server running until the old TTL has passed, and check several public resolvers to follow the change.", c: `
dig +noall +answer example.com @1.1.1.1
dig +noall +answer example.com @8.8.8.8
# the second column is the remaining TTL in seconds; it counts down in a cache
` },
    { q: "Why can you not put a CNAME record on the root of a domain, such as example.com itself?", a: "A CNAME means 'this name is only an alias; take all records from the other name', so no other record may exist for that name. But the root of a domain must have NS and SOA records. The two rules conflict. DNS providers solve it with special record types often called ALIAS or ANAME, or 'CNAME flattening', which answer with normal A records." },
    { q: "What is the difference between a recursive resolver and an authoritative server, and how do you ask the authoritative server directly?", a: "The authoritative server holds the real records of a zone and answers only for that zone. The recursive resolver holds no zones; it finds answers for clients by asking authoritative servers and caches the results. To skip all caches, find the name servers of the domain and send the question straight to one of them.", c: `
dig +short NS example.com
dig @a.iana-servers.net example.com A +norecurse
` }
  ],
  tips: [
    "dig and nslookup ask DNS servers directly and ignore the hosts file. To see what an application on Linux really gets, use 'getent hosts NAME', which follows the same lookup order as programs do.",
    "Test a new server before you change DNS: curl --resolve example.com:443:203.0.113.10 https://example.com/ sends the request to that IP with the correct host name and certificate check.",
    "Clear the local cache after a change: 'ipconfig /flushdns' on Windows, 'resolvectl flush-caches' on Linux with systemd-resolved. Restart the browser too, because it has its own cache.",
    "Long-running programs can keep an old IP address for hours, in a DNS cache inside the runtime or in open pooled connections. After a failover, restart or recycle the connection pools of such services.",
    "When 'it works for me but not for the customer', run 'dig +trace NAME'. It walks from the root servers down and shows the true current answer, without any resolver cache."
  ]
});

EXTRA(16, "TCP, UDP and ports", {
  deep: [
    "The three-way handshake does more than say hello. Each side picks a random starting sequence number and the other side confirms it; they also agree on options such as the maximum segment size. On the server, half-open connections wait in a SYN queue and finished ones wait in an accept queue until the application takes them. If the application is too slow and the accept queue is full, new connections are dropped and clients see timeouts although the server is 'up'.",
    "Closing takes four steps, because each direction is closed on its own: FIN, ACK, then FIN, ACK from the other side. The side that closes first stays in the TIME_WAIT state for about a minute on Linux, so that late packets of the old connection cannot disturb a new one. This is the reason for the error 'Address already in use' when you restart a server quickly. A socket stuck in CLOSE_WAIT means the other side closed and your application has not called close: a leak in your code. A RST packet ends a connection at once, without these steps.",
    "A connection is identified by four values: source IP, source port, destination IP and destination port. A server on port 443 can therefore hold hundreds of thousands of connections, since every client has a different IP or source port. The real limits are memory and open file descriptors. On the client side each new connection needs a free temporary (ephemeral) port, about 28,000 on Linux by default, so a busy client can run out. Also remember that TCP is a stream of bytes with no message borders: one send can arrive as two reads or two sends as one, so the application protocol must mark where a message ends."
  ],
  iq: [
    { q: "What is the difference between 'connection refused' and 'connection timed out' at the packet level?", a: "Refused: your SYN reached the machine and it answered with a RST packet, because no program is listening on that port (or a firewall actively rejects). You get the error immediately. Timed out: your SYN got no answer at all, so the client resent it several times and gave up; usually a firewall silently drops the packet, the address is wrong, or the host is down. So refused means 'host reachable, service missing' and timeout means 'something on the path is dropping'.", c: `
nc -zv -w 3 db.example.com 5432
# Connection refused   -> host answered, nothing listens: check the service
# timed out            -> no answer: check firewall, security group, routing
` },
    { q: "Why does TCP need three steps to connect and not two?", a: "Both sides must send their own starting sequence number and must know that the other side received it. SYN carries the client's number, SYN-ACK confirms it and carries the server's number, and the final ACK confirms the server's number. With only two steps the server could not know that the client got its number, and an old, delayed SYN could open a useless connection." },
    { q: "A port number has 16 bits. Can a server accept only 65,535 connections on port 443?", a: "No. A connection is the combination of source IP, source port, destination IP and destination port. All clients use the same destination port 443, but each has a different IP or source port, so every combination is unique. The limits of a server are memory, CPU and the number of open file descriptors, which you raise with ulimit." },
    { q: "You restart a server and get 'Address already in use'. Nothing else is running on the port. Why?", a: "Old connections of the previous process are still in the TIME_WAIT state, and by default the system refuses to bind the port again while they exist. Set the SO_REUSEADDR socket option before bind; most server frameworks do this for you. If another process really holds the port, find it with ss.", c: `
import socket
srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("0.0.0.0", 9000))
srv.listen()

# who holds the port?   ss -tlnp | grep 9000
` }
  ],
  tips: [
    "Always set a connect timeout and a read timeout in client code. Many libraries wait forever by default, and one silent firewall drop can then freeze all worker threads.",
    "'ss -s' gives a summary of sockets by state, and 'ss -tan state close-wait' lists leaked ones. Many CLOSE_WAIT sockets mean your application does not close connections.",
    "The error 'Too many open files' on a busy server is the file descriptor limit, not disk. Check it with 'ulimit -n' and raise it in the systemd unit with LimitNOFILE.",
    "Firewalls, NAT devices and load balancers silently drop idle connections after some minutes. For long-lived connections (database pools, message queues) enable TCP keep-alive or an application heartbeat shorter than that timeout.",
    "Test a UDP service with 'nc -u HOST PORT' and remember that 'open' is hard to prove: UDP sends no handshake, so silence can mean open, filtered or lost."
  ]
});

EXTRA(16, "HTTP and HTTPS", {
  deep: [
    "Opening a connection is expensive: DNS, a TCP handshake (one round trip) and a TLS handshake (one or two more). HTTP/1.1 therefore keeps the connection open after a response and reuses it; this is called keep-alive. Clients and proxies hold a pool of such open connections. In code this means you should create one client object and reuse it. A new client per request pays the full handshake cost every time and is the most common cause of slow API calls between services.",
    "In HTTP/1.1 a connection carries one request at a time, so browsers open about six connections per site, and one slow response blocks the ones behind it. HTTP/2 splits requests into numbered frames and mixes many requests on one connection; it also compresses headers. But it still runs on TCP, so one lost packet stops all streams until it is resent. HTTP/3 moves to QUIC over UDP, where each stream recovers alone and TLS 1.3 is built in.",
    "Some details cause many real bugs. The Host header tells the server which site you want, since many sites share one IP address. Caching is controlled by Cache-Control: 'no-store' means never save it, while 'no-cache' means you may save it but must ask the server before using it. CORS is checked by the browser, not by the server, which is why a call works with curl and fails in a web page. Retries are safe only for idempotent methods; a repeated POST can create a second order, so payment APIs use an idempotency key sent by the client."
  ],
  iq: [
    { q: "What happens when you type a URL and press Enter?", a: "The browser parses the URL and checks its cache. It resolves the host name with DNS. It opens a TCP connection to the IP on port 443 with the three-way handshake, then does the TLS handshake and checks the certificate. It sends the HTTP request, which often passes a CDN, a load balancer and a reverse proxy before the application answers. The browser reads the response, then fetches the CSS, scripts and images that the HTML names, reusing the connection, and draws the page.", c: `
curl -sv -o /dev/null https://example.com
# shows each step: name resolved, 'Connected to', TLS handshake,
# certificate check, the request headers (>) and the response headers (<)
` },
    { q: "What is the difference between 401 and 403?", a: "401 Unauthorized means the server does not know who you are: the credentials are missing, wrong or expired. Logging in again can fix it. 403 Forbidden means the server knows who you are (or does not care) and still refuses: you lack permission for this resource. Sending the same credentials again will not help; the permissions must change." },
    { q: "What does idempotent mean, and why does it matter for PUT, POST and retries?", a: "A method is idempotent when doing the same request twice leaves the server in the same state as doing it once. GET, PUT and DELETE are; POST is not. It matters because networks fail in the middle: when a response is lost, the client does not know whether the server did the work. An idempotent request can simply be sent again; a POST needs protection such as an idempotency key." },
    { q: "What is the difference between 502, 503 and 504?", a: "All three usually come from a proxy or load balancer in front of the application. 502 Bad Gateway: the proxy could not get a valid response, often because the application crashed or closed the connection. 503 Service Unavailable: there is no server able to take the request now, for example all are unhealthy or overloaded. 504 Gateway Timeout: the application was reached but did not answer within the proxy's time limit.", c: `
curl -s -o /dev/null -w "%{http_code} in %{time_total}s" https://api.example.com/orders
# 504 after exactly 60.0 s points at a proxy timeout, not at a crash
` }
  ],
  tips: [
    "In Python, create one httpx.Client() (or requests.Session()) and reuse it for all calls. Calling httpx.get in a loop opens a new TCP and TLS connection every time.",
    "Retry only GET and other idempotent requests, with a growing wait and some random delay between tries. Retrying at once from many clients turns a small outage into a big one.",
    "Use 302 while you test a redirect and switch to 301 only when it is final. Browsers remember a 301 for a long time, and you cannot take it back from users who already got it.",
    "Send a request ID header (commonly X-Request-ID) from the first service and write it in every log line. Then one grep finds the same request in the proxy, the API and the worker logs.",
    "'curl -sS -D - -o /dev/null URL' prints only the response headers of a normal GET. Use it to check caching, redirects and cookies without the body in the way."
  ]
});

EXTRA(16, "TLS and certificates", {
  deep: [
    "In the TLS 1.3 handshake the client sends a ClientHello. It contains the supported cipher methods, a temporary public value for key exchange, and the server name it wants (SNI). The server answers with its own temporary public value. With a Diffie-Hellman calculation both sides now compute the same secret, and this secret is never sent over the network. Then the server sends its certificate and a signature over the whole handshake, made with the certificate's private key. That signature is the proof that the server owns the certificate.",
    "So the certificate key is used only to sign, to prove identity. It does not encrypt your data. The data is encrypted with keys made from the temporary values, and those are thrown away after the session. This gives forward secrecy: someone who records the traffic today and steals the server's private key next year still cannot read it. Older setups without this property were removed in TLS 1.3.",
    "The client checks a chain: the site certificate is signed by an intermediate CA, and that is signed by a root CA in the client's trust store. The server must send the intermediate certificates itself. Browsers can often repair a missing intermediate, but curl, Python and Java cannot, which gives the classic bug 'works in the browser, fails in the script'. The name is checked against the Subject Alternative Name list. A wildcard such as *.example.com covers one level only: it matches api.example.com but not example.com and not a.b.example.com. Note also that SNI is sent unencrypted, so an observer sees which host name you visit, though not the path or content."
  ],
  iq: [
    { q: "How does HTTPS prevent a man-in-the-middle attack?", a: "An attacker in the middle can receive your packets, but must then act as the server. For that he needs a certificate for the site's name signed by a CA that your device trusts, and the matching private key to sign the handshake. He has neither, so the browser shows a certificate error. He also cannot read along silently, because the session key comes from a key exchange whose secret never crosses the network. The protection is lost if the user clicks past the warning, if code disables verification, or if a rogue CA is installed on the device." },
    { q: "TLS uses both asymmetric and symmetric encryption. Why both?", a: "Asymmetric cryptography (a public and a private key) solves the problem of trust and of agreeing on a secret with a stranger, but it is slow. Symmetric encryption (one shared key, such as AES) is very fast but both sides must already share the key. TLS uses the asymmetric part only in the handshake, to prove identity and agree on a key, and then encrypts all data with the fast symmetric key." },
    { q: "A site opens fine in Chrome, but curl or Python reports 'unable to get local issuer certificate'. What is the usual cause?", a: "The server sends only its own certificate and not the intermediate certificate. Browsers often fill the gap from a cache or by downloading it; command-line tools and libraries do not. Configure the server with the full chain file (fullchain.pem with Let's Encrypt) and verify from the command line.", c: `
openssl s_client -connect example.com:443 -servername example.com -showcerts < /dev/null
# count the certificates in the output (there should be at least two)
# and look for:  Verify return code: 0 (ok)
` },
    { q: "What is SNI and why is it needed?", a: "SNI (Server Name Indication) is a field in the first TLS message where the client names the host it wants. One IP address often serves many sites, and the server must choose the right certificate before it can read the encrypted HTTP request with the Host header. Without SNI the server can only present a default certificate, which gives a name mismatch error. When you test by IP address, you must pass the name yourself.", c: `
openssl s_client -connect 203.0.113.10:443 -servername shop.example.com < /dev/null
curl --resolve shop.example.com:443:203.0.113.10 https://shop.example.com/
` }
  ],
  tips: [
    "Do not use 'curl -k' or verify=False to make an error go away in production. Give the client the right CA instead: 'curl --cacert ca.pem', or the SSL_CERT_FILE or REQUESTS_CA_BUNDLE environment variable for Python tools.",
    "In nginx, point ssl_certificate to fullchain.pem, not to cert.pem. cert.pem has no intermediate certificate and breaks API clients while browsers still look fine.",
    "A renewed certificate on disk is not used until the server reloads. Add a reload to the renewal, for example: certbot renew --deploy-hook 'systemctl reload nginx', and test with 'certbot renew --dry-run'.",
    "Monitor the certificate that the public endpoint really serves, not the file on disk, and alert at 14 days or more before expiry. Load balancers and CDNs often hold their own copy.",
    "An error such as 'certificate is not yet valid' on a fresh certificate usually means the client's clock is wrong. Check the time and the NTP service before you look at the certificate."
  ]
});

EXTRA(16, "Routers, NAT, DHCP and firewalls", {
  deep: [
    "The common form of NAT changes ports as well as addresses. When an inside device opens a connection, the router picks a free port on its public address, rewrites the packet, and writes a line in its connection tracking table: inside IP and port, public port, destination. A reply is matched against this table and sent to the right device. A packet from outside that matches no line is dropped, which is why nobody can start a connection to you from outside without port forwarding.",
    "The table lines do not live forever. An idle entry is removed after a timeout: often well under a minute for UDP and some minutes for TCP on many devices and cloud NAT gateways. After that, the two ends still believe the connection is open, but the next packet is dropped or answered with a reset. This is a main cause of 'connection reset' on database connections that sat idle in a pool. A second limit: one public address has about 64,000 ports, so thousands of connections from one NAT to the same destination can use them all (port exhaustion).",
    "DHCP has four steps, known as DORA: the client broadcasts Discover, a server answers with Offer, the client sends Request, and the server confirms with Acknowledge. It uses UDP ports 67 and 68. The address is a lease; the client asks to renew at half of the lease time. Firewalls come in two kinds. A stateless filter judges every packet alone, so you must also write rules for the returning traffic. A stateful firewall tracks connections and lets replies through automatically. Also note the difference between DROP and REJECT: drop says nothing and the client waits for a timeout; reject answers at once and the client sees 'connection refused'."
  ],
  iq: [
    { q: "Twenty laptops share one public IP address. How does a reply find the right laptop?", a: "The router does port address translation. For each outgoing connection it replaces the private source address and port with its public address and a unique port, and stores that mapping in a table. The reply comes back to that public port, the router looks it up in the table, restores the private address and port, and forwards the packet. The port number is what tells the connections apart." },
    { q: "What is the difference between a stateful and a stateless firewall? Give a cloud example.", a: "A stateful firewall remembers the connections it has allowed, so the reply traffic passes without an extra rule. A stateless one checks each packet by itself, so you need rules in both directions, including the high temporary ports that replies use. In AWS, security groups are stateful and have only allow rules; network ACLs are stateless, have allow and deny rules, and are checked in order of rule number." },
    { q: "What are the steps of DHCP, and what happens when the DHCP server is down?", a: "Discover, Offer, Request, Acknowledge. The first message is a broadcast, because the client has no address yet and does not know the server. If the server is down, machines that already have a lease keep working until the lease ends. New machines, and machines whose lease runs out, get no address and fall back to a 169.254.x.x link-local address with no gateway.", c: `
# Windows
ipconfig /all          # shows the DHCP server and when the lease ends
ipconfig /release
ipconfig /renew

# Linux
ip addr show eth0      # 'dynamic' and valid_lft show the lease
` },
    { q: "An application's database connection fails with 'connection reset' after it was idle for some minutes. What is the cause and the fix?", a: "A device on the path, such as a NAT gateway, firewall or load balancer, removed the idle connection from its table. The application's pool still thinks the connection is open, and the first query on it fails. Send keep-alive packets more often than the idle timeout, or let the pool test and recycle connections. The Linux default of two hours before the first keep-alive packet is far too long for this.", c: `
sysctl net.ipv4.tcp_keepalive_time      # 7200 seconds by default

# SQLAlchemy: test connections before use and recycle them every 5 minutes
# engine = create_engine(url, pool_pre_ping=True, pool_recycle=300)
` }
  ],
  tips: [
    "On a remote server, run 'sudo ufw allow 22/tcp' before 'sudo ufw enable'. If you enable a default-deny firewall first, you cut your own SSH session and need console access to get back in.",
    "Ports published by Docker (-p 5432:5432) skip ufw rules, because Docker writes its own iptables rules. Publish to localhost only (-p 127.0.0.1:5432:5432) or do not publish database ports at all.",
    "'sudo iptables -L -n -v --line-numbers' shows a packet counter for every rule. Send test traffic and watch which counter grows; that is the rule that really matches.",
    "In cloud rules, use another security group as the source instead of IP addresses. The rule then stays correct when servers are replaced or the group scales.",
    "If you restrict outgoing traffic, remember what every server needs: DNS (53), time sync (NTP, UDP 123) and HTTPS for package updates. A missing DNS rule looks like 'the whole network is down'."
  ]
});

EXTRA(16, "Load balancers, proxies, CDNs and VPNs", {
  deep: [
    "A layer 4 load balancer chooses a server once, when the TCP connection starts, and then passes all packets of that connection to it. It never reads the content, so it can carry any protocol and can pass TLS through untouched. A layer 7 load balancer ends the client's TCP and TLS connection, reads each HTTP request, and sends it over a second connection, usually taken from a pool of kept-alive connections to the servers. There are two separate connections, so the server sees the balancer's IP address, and the real client address is passed in the X-Forwarded-For header.",
    "This difference has real effects. With long-lived connections such as gRPC or WebSocket, a layer 4 balancer spreads connections, not requests; a few busy connections can overload one server while others are idle. Health checks also need care. A check that tests the database too can mark every server unhealthy at the same moment when the database has a short problem, and the balancer then has no server left. Timeouts form a chain: if a server closes idle connections sooner than the balancer does, the balancer sometimes sends a request on a connection that is already closed, and the user gets a random 502.",
    "A CDN stores a response under a cache key, normally the URL, and keeps it as long as the Cache-Control header allows. A changed file under the same URL stays old on the CDN and in browsers until that time ends, which is why build tools put a hash of the content in file names. A VPN works by encapsulation: the original IP packet is encrypted and placed inside a new packet, usually UDP. The extra headers lower the usable MTU. In a full tunnel all traffic goes through the VPN; in a split tunnel only the private ranges do. A forward proxy must be configured or known on the client side, often through the HTTP_PROXY, HTTPS_PROXY and NO_PROXY variables, while a reverse proxy is invisible to the client."
  ],
  iq: [
    { q: "What is the difference between a layer 4 and a layer 7 load balancer, and when do you choose each?", a: "Layer 4 forwards TCP or UDP connections using only IP addresses and ports. It is fast, works for any protocol (databases, mail, custom TCP) and can leave TLS encrypted end to end. Layer 7 understands HTTP: it can route by host or path, end TLS, add headers, retry and use cookies. Choose layer 7 for web applications and APIs, and layer 4 for non-HTTP traffic or when you need the highest speed and simple pass-through.", c: `
# nginx as a layer 4 balancer (stream block): it sees only TCP
stream {
    upstream postgres {
        server 10.0.3.11:5432;
        server 10.0.3.12:5432;
    }
    server {
        listen 5432;
        proxy_pass postgres;
    }
}
` },
    { q: "What is the difference between a forward proxy and a reverse proxy?", a: "A forward proxy works for clients: the clients are set up to send their requests through it, and the target server sees the proxy, not the client. It is used for filtering, logging and hiding clients. A reverse proxy works for servers: clients think they talk to the site itself, and the proxy passes requests to hidden internal servers. It is used for TLS, routing, caching and load balancing. The simple test is: who knows that the proxy exists? With a forward proxy the client knows; with a reverse proxy only the server side knows." },
    { q: "Behind a load balancer, the application logs show the same client IP for every request. How do you get the real one?", a: "The application sees the address of the proxy, because the proxy opens its own connection. A layer 7 proxy adds the original address to the X-Forwarded-For header. Read it from there, but only trust the header when the request came from your own proxy, because any client can send a fake value. For layer 4 balancers the PROXY protocol does the same job.", c: `
# nginx on the application server: take the client address from the header,
# but only when the request comes from the load balancer's network
set_real_ip_from 10.0.0.0/8;
real_ip_header X-Forwarded-For;
` },
    { q: "After a second server is added behind the load balancer, users are logged out at random. Why?", a: "The sessions are stored in the memory of each server. A user logs in on server A, the next request goes to server B, and B knows nothing about that session. One fix is sticky sessions, where the balancer sends a user always to the same server, but then a server failure still logs those users out. The better fix is to make servers stateless: keep sessions in a shared store such as Redis, or use signed tokens." }
  ],
  tips: [
    "Set the application's keep-alive timeout longer than the load balancer's idle timeout (for example 75 seconds on the app when the balancer uses 60). The other way round gives occasional 502 errors that are very hard to reproduce.",
    "Make the health check endpoint cheap and local: it should say 'this process can serve requests'. Do not let one slow shared dependency fail the health check of every server at once.",
    "Give static files a content hash in the name (app.3f9a1c.js) with a long max-age, and give HTML a short one. Then a deploy is visible at once and you never need to purge the CDN.",
    "nginx waits 60 seconds for the upstream by default (proxy_read_timeout). A report endpoint that needs 90 seconds returns 504 from nginx although the application finished its work; raise the timeout for that location or make the job asynchronous.",
    "To proxy WebSocket through nginx you must set proxy_http_version 1.1 and pass the Upgrade and Connection headers. Without them the handshake fails and the client falls back or disconnects."
  ]
});

EXTRA(16, "Troubleshooting tools", {
  deep: [
    "Knowing how a tool works tells you what its result proves. ping sends ICMP echo packets. ICMP has no ports, so ping says nothing about a service, and many networks block it, so a failed ping does not prove the host is down. traceroute sends packets with a TTL of 1, then 2, then 3 and so on. Each router lowers the TTL, and the router where it reaches zero sends back an ICMP 'time exceeded' message, which reveals that router's address. Linux traceroute sends UDP probes by default and Windows tracert sends ICMP, so the two can show different results through the same firewall.",
    "Read traceroute with care. A line of stars in the middle is normal: that router just does not answer, and later hops still reply. Stars from one hop all the way to the end show where packets really stop. High delay at one middle hop that is not seen at the following hops is not a problem either; routers answer such probes with low priority. The path back to you can also be different from the path out.",
    "curl can time each phase of a request, and the numbers are counted from the start: time_namelookup (DNS done), time_connect (TCP connected), time_appconnect (TLS done), time_starttransfer (first byte of the response) and time_total. The gap that is large tells you the layer: DNS, network, TLS, or the server's own work. In tcpdump, read the TCP flags: [S] is SYN, [S.] is SYN-ACK, [.] is ACK, [P.] is data, [F.] is FIN and [R] is reset. Repeated [S] with no answer means the packets are dropped; [S] answered by [R] means the port is closed; a complete handshake followed by silence means the application is the problem."
  ],
  iq: [
    { q: "ping to a server fails, but its website works. How is that possible? And the opposite?", a: "ping uses ICMP, and many firewalls and cloud security groups block ICMP while they allow TCP port 443. So a failed ping does not mean the host is down. The opposite also happens: ping works because the machine is up, but the website fails because the service is stopped, the port is blocked, or the application returns errors. Always test the real port and protocol." },
    { q: "A service answers 'curl localhost:8000' on the server itself, but other machines cannot connect. What do you check, in order?", a: "First the listen address: if the service is bound to 127.0.0.1 it accepts only local connections and must be bound to 0.0.0.0 or the server's IP. Then the host firewall (ufw, firewalld, Windows Firewall). Then the cloud security group or network firewall. Then routing between the two networks. The error helps: 'refused' points to the listen address, 'timed out' points to a firewall.", c: `
ss -tlnp | grep 8000
# 127.0.0.1:8000   -> local only: change the bind address
# 0.0.0.0:8000     -> listening on all interfaces: look at firewalls next
sudo ufw status
` },
    { q: "How does traceroute work, and what do the stars mean?", a: "It sends packets with a growing TTL value, starting at 1. Each router on the path lowers the TTL, and the one that brings it to zero drops the packet and reports back with an ICMP message, so each round reveals one more router. A star means no answer came for that probe. Stars in the middle with normal hops after them are harmless; only stars that continue to the end mark the place where traffic stops." },
    { q: "An API call is slow 'sometimes'. How do you find which part is slow?", a: "Measure the phases instead of the total. curl can print the time for DNS, TCP connect, TLS and the first byte. Run it many times and compare: a big DNS time points to the resolver, a big connect time to the network or a full server queue, a big gap before the first byte to the application or its database. Run it from the machine that has the problem.", c: `
curl -o /dev/null -s -w "dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first-byte %{time_starttransfer}  total %{time_total}" https://api.example.com/health
` }
  ],
  tips: [
    "Small containers often have no nc or telnet. Bash can test a port alone: timeout 3 bash -c '< /dev/tcp/db.example.com/5432' && echo open. curl can do it too: curl -v telnet://db.example.com:5432.",
    "Capture with a tight filter and save to a file: sudo tcpdump -i any -nn host 203.0.113.10 and tcp port 443 -w /tmp/cap.pcap. Then open the file in Wireshark on your laptop.",
    "Use 'mtr -rwc 50 HOST' instead of a single traceroute. It sends 50 rounds and prints loss and delay per hop, which shows problems that come and go.",
    "When packets seem to vanish, capture on both machines at the same time. If the sender shows the SYN leaving and the receiver never sees it, the fault is in between, and you have proof for the network team.",
    "To find which process holds a port: 'ss -tlnp | grep :8000' or 'lsof -i :8000' on Linux; on Windows use Get-NetTCPConnection -LocalPort 8000 and then Get-Process -Id with the OwningProcess number."
  ]
});
