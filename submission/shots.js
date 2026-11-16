/* 把应用驱动到指定状态，供无头浏览器截图 */
(function () {
  'use strict';
  var shot = new URLSearchParams(location.search).get('shot') || 'overview';
  var frame = document.getElementById('app');

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function readFile(path) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('GET', path);
      x.responseType = 'arraybuffer';
      x.onload = function () { resolve(x.response); };
      x.onerror = reject;
      x.send();
    });
  }

  frame.addEventListener('load', async function () {
    var w = frame.contentWindow;
    var d = frame.contentDocument;
    var panel = d.getElementById('result-panel');

    if (shot === 'csv') {
      var buf = await readFile('../samples/legacy-export.csv');
      var dt = new w.DataTransfer();
      dt.items.add(new w.File([buf], 'legacy-export.csv', { type: 'text/csv' }));
      var input = d.getElementById('file-input');
      input.files = dt.files;
      input.dispatchEvent(new w.Event('change'));
      await wait(400);
      d.getElementById('status-msg').scrollIntoView();
      w.scrollBy(0, -20);
      return;
    }

    d.getElementById('btn-sample').click();
    await wait(150);

    if (shot === 'table') {
      panel.scrollIntoView();
      w.scrollBy(0, -12);
    } else if (shot === 'search') {
      var kw = d.getElementById('f-keyword');
      kw.value = '费 已完成';
      kw.dispatchEvent(new w.Event('input'));
      await wait(300);
      panel.scrollIntoView();
      w.scrollBy(0, -12);
    }
  });
})();
