/* A fictional profile so the studio works without a username or network. */
(function (root) {
  const now = Date.now(), ago = (d) => new Date(now - d * 864e5).toISOString();
  const R = (name, description, language, stargazers_count, topics = [], d = 3) => ({ name, description, language, stargazers_count, forks_count: Math.round(stargazers_count / 9), topics, fork: false, archived: false, pushed_at: ago(d), html_url: 'https://github.com/' + 'nova-demo/' + name, homepage: '' });
  const DEMO = {
    user: { login: 'nova-demo', name: 'Nova Rao', bio: 'I build tiny robots and fast backends.', location: 'Bengaluru, India', followers: 1284, public_repos: 14, created_at: '2019-03-02T00:00:00Z', html_url: 'https://github.com/nova-demo' },
    repos: [
      R('pocket-rover', 'A palm-sized rover that maps your room with a $5 lidar and an ESP32.', 'C++', 812, ['robotics', 'esp32', 'slam']),
      R('queue-bench', 'Kafka vs Redis Streams vs NATS, benchmarked honestly on one laptop.', 'Go', 455, ['kafka', 'benchmark']),
      R('tiny-vit', 'A vision transformer you can read in one sitting. Trains on CIFAR-10.', 'Python', 390, ['pytorch', 'education']),
      R('lofi-player', 'A lo-fi music player that adapts to your typing speed.', 'TypeScript', 211, ['webaudio', 'fun']),
      R('ticket-rush', 'A seat booking API that survives 10k users hitting buy at once.', 'Java', 176, ['spring-boot', 'concurrency']),
      R('dotfiles', 'Terminal, editor and window manager config.', 'Shell', 12, [], 40),
    ],
    langBytes: { Python: 420000, 'C++': 310000, TypeScript: 260000, Go: 190000, Java: 150000, Shell: 30000, CSS: 25000 },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DEMO; else root.RMDemo = DEMO;
})(typeof self !== 'undefined' ? self : this);
