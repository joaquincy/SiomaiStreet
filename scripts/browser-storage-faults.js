// Served only by the loopback acceptance harness when ?storageTest=1 is present.
// Faults are temporary, page-local and disappear on reload. No production import.
(() => {
  let mode = 'normal';
  const set = Storage.prototype.setItem;
  const remove = Storage.prototype.removeItem;
  const open = IDBFactory.prototype.open;
  Storage.prototype.setItem = function (...args) {
    if (this === localStorage && mode === 'save') throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
    return set.apply(this, args);
  };
  Storage.prototype.removeItem = function (...args) {
    if (this === localStorage && mode === 'cleanup') throw new DOMException('Synthetic cleanup failure', 'SecurityError');
    return remove.apply(this, args);
  };
  IDBFactory.prototype.open = function (...args) {
    if (mode === 'files') throw new DOMException('Synthetic IndexedDB failure', 'SecurityError');
    return open.apply(this, args);
  };
  addEventListener('DOMContentLoaded', () => {
    const panel = document.createElement('aside');
    panel.setAttribute('aria-label', 'Synthetic storage fault controls');
    for (const [value, label] of [['save', 'Fail draft writes'], ['cleanup', 'Fail draft cleanup'], ['files', 'Fail document storage'], ['normal', 'Restore storage']]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.onclick = () => { mode = value; status.textContent = 'Storage test mode: ' + value; };
      panel.append(button);
    }
    const status = document.createElement('p');
    status.textContent = 'Storage test mode: normal';
    panel.append(status);
    document.body.prepend(panel);
  });
})();
