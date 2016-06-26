// ==UserScript==
// @name        Gamekyo+
// @namespace   http://
// @include     http://*gamekyo.com/bloglist.html
// @version     1
// @require     https://code.jquery.com/jquery-3.0.0.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.7/angular.js
// @grant       none
// ==/UserScript==

$('body').attr('ng-app','gk');
$('#column-1').attr('ng-controller', 'blogController');

$('#column-1 .box-title-external').attr('ng-filters', '');
$('#element-list').attr('ng-blogs', '');
// Prepare filter
$('.option-link a').attr('ng-click', 'loadNextPage($event)').attr('ng-class', "isLoadingNextPage ? 'loader' : ''");

/////////////////////////////
// ANGULAR INIT //
///////////////////////////
var app = angular.module('gk', [])
    .service('utils', [function() {
        this.generateJson = function(dom) {
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

        this.buildTemplate = function() {
            var item = $('#element-0').clone();
            item
                .attr('id', 'element-{{ $index }}')
                .attr('ng-repeat', 'item in list | filter:filters')
                .attr('ng-class', "{'white-background' : $index%2==0, 'gray-background' : !($index%2==0)}")
                .removeClass('white-background, gray-background');
            $('.element-title div:first a', item)
                .removeAttr('href').attr('ng-href', '{{ item.href }}')
                .html('{{ item.title }}');
            $('.element-detail > a.member, .element-detail > a.group', item)
                .removeAttr('class').attr('ng-class', "item.isGroup ? 'group' : 'member'")
                .html('{{ item.author }}');
            $('.details > .date', item)
                .html('{{ item.date }}');
            $('.details > a', item)
                .html('{{ item.nbComs }}');

            return item[0].outerHTML;
        };
    }])
    .directive('ngFilters', function() {
        return {
            template: '<div class="box-title-external">Filters: <input type="checkbox" ng-click="filterByGroup()" /></div>'
        };
    })
    .directive('ngBlogs', ['$compile', 'utils', function($compile, utils) {
        return {
            restrict: 'A',
            replace: true,
            controller: function($scope, $element) {
                $scope.list = utils.generateJson($('div[id^="element-"]', $element));
            },
            link: function(scope, elem, attr, ctrl) {
                elem.html(utils.buildTemplate());
                $compile(elem.contents())(scope);
            }
        };
    }])
    .controller('blogController', ['$scope', '$http', 'utils', function ($scope, $http, utils) {
        $scope.isLoadingNextPage = false;
        $scope.filters = {};
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

                $.merge($scope.list, utils.generateJson(filtered));
                $scope.linkToNextPage = newDom.find('.option-link a:last').attr('href');
            }, function(){});
        };
    }]
);