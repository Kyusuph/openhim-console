'use strict';

var app = angular.module('openhimWebui2App');

/**********************************************************************************************/
/*	Setup of App Constants - (Global Variables)																								*/
/**********************************************************************************************/
app.constant('TITLE', 'OpenHIM Admin Console');
app.constant('FOOTERTITLE', 'OpenHIM Administration Console');

app.constant('HOST', 'openhim-preprod.jembi.org');
app.constant('PORT', 8080);



/**********************************************************************************************/
/*	This is the AppConfig controllers																													*/
/*	This controller encapsulates all other controllers																				*/
/*	Default applications settings are initialzed here - Assign global variable to scope				*/
/**********************************************************************************************/
app.controller('AppConfigCtrl', function($scope, TITLE, FOOTERTITLE) {
  $scope.appTitle = TITLE;
  $scope.appFooterTitle = FOOTERTITLE;
});
