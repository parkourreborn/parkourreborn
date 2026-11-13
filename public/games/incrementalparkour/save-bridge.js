(function () {
  var origin = window.location.origin;
  var host = window.parent !== window ? window.parent : null;
  var instance = null;
  var queue = [];
  var waiting = null;

  function send(method, value) {
    if (!instance) {
      queue.push([method, value]);
      return;
    }

    try {
      instance.SendMessage('SaveManager', method, value);
    } catch (error) {
      console.error('ParkourSave send failed', error);
    }
  }

  function answer(json) {
    if (waiting) {
      clearTimeout(waiting);
      waiting = null;
    }

    send('OnProfileLoaded', typeof json === 'string' ? json : '');
  }

  function post(message) {
    if (host) host.postMessage(message, origin);
  }

  window.ParkourSave = {
    requestProfile: function () {
      if (!host) {
        answer('');
        return;
      }

      if (waiting) clearTimeout(waiting);
      waiting = setTimeout(function () {
        waiting = null;
        send('OnProfileLoaded', '');
      }, 7000);

      post({ type: 'parkour-save:request' });
    },

    push: function (json) {
      if (!host) return;

      post({ type: 'parkour-save:push', json: json });
    },

    attach: function (next) {
      instance = next;
      var pending = queue.slice();
      queue.length = 0;
      pending.forEach(function (item) {
        send(item[0], item[1]);
      });
    },
  };

  window.addEventListener('message', function (event) {
    if (event.origin !== origin || event.source !== host) return;

    var data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'parkour-save:profile') answer(data.json);
    if (data.type === 'parkour-save:rejected') send('OnSaveRejected', String(data.reason || 'error'));
  });

  post({ type: 'parkour-save:ready' });
})();
