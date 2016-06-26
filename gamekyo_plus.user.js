// ==UserScript==
// @name        Gamekyo+
// @namespace   http://
// @include     http://*gamekyo.com/bloglist.html
// @version     1
// @require     https://code.jquery.com/jquery-3.0.0.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/angular.js/1.5.7/angular.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/angular-moment/0.10.3/angular-moment.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.13.0/moment-with-locales.min.js
// @grant       none
// ==/UserScript==

$('body').attr('ng-app','gk');
$('#column-1').attr('ng-controller', 'blogController');

$('#column-1 .box-title-external').attr('ng-filters', '');
$('#element-list').attr('ng-blogs', '');
// Prepare filter
$('.box-container-external .element-title.white-font', '#column-1').html('Articles ({{ list.length }})');
$('.option-link').attr('ng-lazy-loader', '');

/////////////////////////////
// ANGULAR INIT //
///////////////////////////
var app = angular.module('gk', ['angularMoment'])
    .run(function(amMoment) {
        amMoment.changeLocale('fr');
    })
    .service('utils', 'moment', [function(moment) {
        this.generateJson = function(dom) {
            var jsonArticles = [];

            dom.each(function(i, val) {
                var article = $(val);

                var dateRaw = article.find('.details > .date').text(); //le 26/06/16 à 19h19
                var moment = moment(dateRaw, '[le] DD/MM/YY [à] HH[h]mm');

                jsonArticles.push({
                    title: article.find('.element-title div:first a').text(),
                    href: article.find('.element-title div a').attr('href'),
                    author: (article.find('.element-detail > a.member').text() || article.find('.element-detail > a.group').text()),
                    isGroup: (article.find('.element-detail > a.group').length === 1),
                    date: moment,
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
            $('.details > .date', item).attr('am-time-ago', 'item.date').empty();
                // .html('{{ item.date }}');
            $('.details > a', item)
                .html('{{ item.nbComs }}');

            return item[0].outerHTML;
        };
    }])
    .directive('ngFilters', function() {
        return {
            template: ' \
            <div class="box-title-external"> \
            <label for="onlyGroups">Afficher seulement les groupes</label> \
            <input id="onlyGroups" type="checkbox" ng-click="filterByGroup()" /> \
            </div>'
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
    .directive('ngLazyLoader', ['$window', '$http', 'utils', function($window, $http, utils) {
        return {
            restrict: 'A',
            link: function(scope, elem, attr) {
                scope.isLazyLoading = false;
                scope.condition = function() {
                    return ($window.innerHeight + $window.scrollY) >= document.body.offsetHeight;
                };

                var a = elem.find('a:last');
                scope.nextLink = a.attr('href');

                angular.element($window).bind('scroll', function() {
                    if (scope.condition() && !scope.isLazyLoading) {
                        scope.isLazyLoading = true;

                        $http.get(scope.nextLink).then(function(response){
                            var newDom = angular.element(response.data);
                            var filtered = newDom.find('#element-list > div[id^="element-"]');

                            $.merge(scope.list, utils.generateJson(filtered));
                            
                            scope.nextLink = $('.option-link a:last', newDom).attr('href');
                            scope.isLazyLoading = false;
                        }, function(){});
                    }
                });
            }
        };
    }])
    .controller('blogController', ['$scope', function ($scope) {
        $scope.filters = {};

        $scope.filterByGroup = function() {
            if (!('isGroup' in $scope.filters)) {
                $scope.filters = { isGroup: true };

                return;
            }

            $scope.filters = {};
        };
    }]
);