// ==UserScript==
// @name         Undesirable Link Mover for Hacker News
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script rearranges articles on Hacker News so less desirable articles appear below more desiarable ones.
// @match        https://news.ycombinator.com/*
// @grant        All
// ==/UserScript==

(function() {
    'use strict';
    // Lists of sites that need moving
    var SITES_TO_MOVE = [
        "www.wsj.com",
        "www.ft.com",
        'www.mercurynews.com',
        "www.nytimes.com",
    ];

    var storyItemsTable = document.getElementsByClassName("itemlist")[0];
    var storyItemsBody = storyItemsTable.getElementsByTagName("tbody")[0];
    var moved = false;

    var moveRow = function(rowID) {
        // We are moving the title-row, the statistics row, and the spacer row.
        if (!moved) {
            var orangeDivider = document.createElement('tr');
            orangeDivider.innerHTML = ('<td><img src="s.gif" height="10" width="0" /></td>');
            storyItemsBody.appendChild(orangeDivider);
        }
        moved = true;
        for (var x = 0; x < 3; x++) {
            // Append seems to move the row.
            storyItemsBody.append(storyItemsBody.rows[rowID]);
        }
    };

    var needsMoving = function(link) {
        return (SITES_TO_MOVE.includes(link));
    };

    for (var i = 0; i < storyItemsBody.rows.length; i = i + 3) {
        var storyRow = storyItemsBody.rows[i];
        if (storyRow.className == "athing") {
            var storyHost = storyRow.getElementsByClassName("storyLink")[0].hostname;
            if (needsMoving(storyHost)) {
                moveRow(storyRow.rowIndex);
            }
        }
    }
})();
