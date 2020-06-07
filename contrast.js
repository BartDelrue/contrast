(function () {
  'use strict';
  var csvForm = document.querySelector('form.csv')
    , csvSubmit = csvForm.querySelector('input[type=submit')
    , csvTextarea = csvForm.querySelector('textarea.csv')
    , csvErrorzone = csvForm.querySelector('.errors.csv')
    , progress = document.querySelector('.progress > span')
    , small = document.querySelector('#passes')
    , large = document.querySelector('#large')
    , passTitle = document.querySelector('#passTitle')
    , fails = document.querySelector('#fails')
    , failTitle = document.querySelector('#failTitle')
    , largeTitle = document.querySelector('#largeTitle')
    , hexPattern = /^#(?:[0-9a-fA-F]{3}){1,2}$/
    , rgbPattern = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
    ,
    rgbaPattern = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0?(\.\d+)?|1(\.0+)?)\s*\)$/
    , byForeground = false;

  var setInitial = function () {

    if (window.location.search) {
      csvTextarea.value = decodeURIComponent(window.location.search.substring(8));
    }

    if (!csvTextarea.value) {
      csvTextarea.value = 'white,#ffffff\n' +
        'black,#000000\n' +
        'teal,#0FAF88';
    }
  };

  var calcL = function (hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255,
      g = parseInt(hex.slice(3, 5), 16) / 255,
      b = parseInt(hex.slice(5, 7), 16) / 255;

    var rg = r <= .03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4),
      gg = g <= .03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4),
      bg = b <= .03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return .2126 * rg + .7152 * gg + .0722 * bg;
  };

  var calcRatio = function (colorA, colorB) {
    var a = calcL(colorA),
      b = calcL(colorB);

    if (a > b) {
      return (a + .05) / (b + .05);
    }
    return (b + .05) / (a + .05);
  };

  var addEvents = function () {
    csvForm.addEventListener('submit', combineCSV);
  };

  var combineOne = function (color, colors, next) {

    var smallContainer = document.createElement('div');
    var largeContainer = document.createElement('div');
    var failContainer = document.createElement('div');
    smallContainer.className = 'color-container';
    smallContainer.id = 'color_' + color.name;
    largeContainer.className = 'color-container';
    largeContainer.id = 'color_' + color.name;

    for (var i = 0; i < colors.length; i++) {
      var background = byForeground ? colors[i] : color;
      var foreground = byForeground ? color : colors[i];

      if (foreground === background) {
        continue;
      }

      var ratio = Math.round(calcRatio(background.rgb, foreground.rgb) * 100) / 100;

      var colorBox = document.createElement('div');
      colorBox.className = 'color-box';

      var example = document.createElement('div');
      example.style.background = background.rgb;
      example.style.color = foreground.rgb;
      example.innerText = foreground.name + ' on ' + background.name;
      colorBox.appendChild(example);

      var ratioContainer = document.createElement('div');
      ratioContainer.innerHTML = '<strong>Ratio</strong> ' + ratio + ':1 <br>';
      ratioContainer.innerHTML += '<br><strong>Foreground</strong>' + foreground.rgb;
      ratioContainer.innerHTML += '<br><strong>Background</strong>' + background.rgb;

      colorBox.appendChild(ratioContainer);

      if (ratio >= 4.5) {
        smallContainer.appendChild(colorBox);
        continue;
      }
      if (ratio >= 3) {
        largeContainer.appendChild(colorBox);
        continue;
      }
      failContainer.appendChild(colorBox);
    }
    next(smallContainer, largeContainer, failContainer, color);
  };

  var resetState = function (zone) {
    zone.innerHTML = '';
    small.innerHTML = '';
    large.innerHTML = '';
    fails.innerHTML = '';
    passTitle.hidden = false;
    failTitle.hidden = false;
    largeTitle.hidden = false;
  };

  var componentToHex = function (c) {
    var hex = (+c).toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  };

  var rgbToHex = function (r, g, b) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
  };

  function rgba2Hex (r, g, b, a) {
    return rgbToHex(
      Math.round((1 - a) * 255 + a * r),
      Math.round((1 - a) * 255 + a * g),
      Math.round((1 - a) * 255 + a * b)
    );
  }

  var combineCSV = function (e) {
    e.preventDefault();

    byForeground = document.querySelector('#rd-fg').checked;
    csvSubmit.disabled = true;
    progress.style.width = '0%';
    var progressCount = 0;

    // update url
    if (history.pushState) {
      var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?colors=' + encodeURIComponent(csvTextarea.value);
      window.history.pushState({path: newurl}, '', newurl);
    }

    resetState(csvErrorzone);
    csvErrorzone.appendChild(document.createElement('ul'));

    var colors = [];
    var csvLines = csvTextarea.value.split('\n');

    // convert to JSON
    for (var k = 0; k < csvLines.length; k++) {
      var color = csvLines[k].split(',');
      if (color.length >= 2 && hexPattern.test(color[1].trim())) {
        color = {
          'name': color[0].trim(),
          'rgb': color[1].trim()
        };
        colors.push(color);
      }
      if (color.length >= 4) {
        var rgb = rgbPattern.exec(color[1].trim() + ',' + color[2] + ',' + color[3].trim());
        var rgba = rgbaPattern.exec(color[1].trim() + ',' + color[2] + ',' + color[3] + ',' + (color[4] || '').trim());
        if (rgb) {
          color = {
            'name': color[0].trim(),
            'original': rgb[0],
            'rgb': rgbToHex(rgb[1], rgb[2], rgb[3])
          };
          colors.push(color);
        }
        if (rgba) {
          color = {
            'name': color[0].trim(),
            'original': rgba[0],
            'rgb': rgba2Hex(rgba[1].trim(), rgba[2], rgba[3], rgba[4].trim())
          };
          colors.push(color);
        }
      }

      if (!color.rgb) {
        var li = document.createElement('li');
        li.innerText = 'Line [' + (k + 1) + '] is invalid: ' + csvLines[k];
        csvErrorzone.querySelector('ul').appendChild(li);
      }
    }

    for (var i = 0; i < colors.length; i++) {
      combineOne(colors[i], colors, function (smallContainer, largeContainer, failContainer) {
        setTimeout(function () {
          progressCount += 100 / colors.length;
          progress.style.width = progressCount + '%';

          if (smallContainer.childNodes.length) {
            small.appendChild(smallContainer);
          }
          if (largeContainer.childNodes.length) {
            large.appendChild(largeContainer);
          }
          if (failContainer.childNodes.length) {
            fails.innerHTML += failContainer.innerHTML;
          }
          if (Math.ceil(progressCount) >= 100) {
            csvSubmit.disabled = false;
          }
        });
      });
    }
  };

  setInitial();
  addEvents();
})();
