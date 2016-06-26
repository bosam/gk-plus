// ==UserScript==
// @name        Gamekyo+
// @namespace   http://
// @include     http://*gamekyo.com/bloglist.html
// @version     1
// @require     https://code.jquery.com/jquery-3.0.0.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.7/angular.js
// @grant       none
// ==/UserScript==

var init = function() {
$('body').attr('ng-app','gk');

var createJson = function(dom) {
    var jsonArticles = [];

    dom.each(function(i, val) {
        var article = $(val);

        jsonArticles.push({
            title: article.find('.element-title div:first a').text(),
            href: article.find('.element-title div a').attr('href'),
            author: (article.find('.element-detail > a.member').text() || article.find('.element-detail > a.group').text()),
            isGroup: (article.find('.element-detail > a.group').length === 1),
            date: article.find('.details > .date').text(),
            nbComs: parseInt(article.find('.details > a').text().match(/\(([\d])+\)/)[1], 10),
        });
    });

    return jsonArticles;
};
var firstArticles = createJson($('div[id^="element-"]:not([id="element-list"])', '#column-1'));

$('#column-1').attr('ng-controller', 'listArticle');
var item = $('#element-list > div:first').clone();

item
    .attr('id', 'element-{{ $index }}')
    .attr('ng-repeat', 'item in listArticles | filter:filters')
    .attr('ng-class', "{'white-background' : $index%2==0, 'gray-background' : !($index%2==0)}")
;
item.removeClass('white-background, gray-background');
item.find('.element-title div:first a').removeAttr('href').attr('ng-href', '{{ item.href }}').html('{{ item.title }}');
item
    .find('.element-detail > a.member, .element-detail > a.group')
    .removeAttr('class').attr('ng-class', "item.isGroup ? 'group' : 'member'")
    .html('{{ item.author }}')
;
item
    .find('.details > .date')
    .html('{{ item.date }}')
;
item
    .find('.details > a')
    .html('{{ item.nbComs }}')
;

$('#element-list').empty();
$('#element-list').prepend(item);

// Prepare filter
$('<div class="box-title-external">Filters: <input type="checkbox" ng-click="filterByGroup()" /></div>').insertAfter('#column-1 .box-title-external');


nextLink = $('.option-link a');
nextLink.attr('ng-click', 'loadNextPage($event)').attr('ng-class', "isLoadingNextPage ? 'loader' : ''");

///////////////
// ANGULAR INIT
///////////////
var app = angular.module('gk', [])
    .constant('config', {
        firstArticles: firstArticles
    })
    .controller('listArticle', ['$scope', '$http', 'config', function ($scope, $http, config) {
        $scope.listArticles = config.firstArticles;
        $scope.isLoadingNextPage = false;
        $scope.filters = {};
        $scope.isShown = true;
        $scope.linkToNextPage = angular.element('.option-link a:last').attr('href');

        $scope.filterByGroup = function() {
            if (!('isGroup' in $scope.filters)) {
                $scope.filters = { isGroup: true };

                return;
            }

            $scope.filters = {};
        };

        $scope.loadNextPage = function($event) {
            $event.preventDefault();

            $http.get($scope.linkToNextPage).then(function(response){
                var newDom = $(response.data);
                var filtered = newDom.find('#column-1 div[id^="element-"]:not([id="element-list"])');

                $.merge($scope.listArticles, createJson(filtered));
                $scope.linkToNextPage = newDom.find('.option-link a:last').attr('href');
            }, function(){});
        };
    }]);
}();