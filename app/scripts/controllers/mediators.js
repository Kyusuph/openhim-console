import confirmModal from '~/views/confirmModal'
import mediatorConfigModal from '~/views/mediatorConfigModal'
import { ConfirmModalCtrl, MediatorConfigModalCtrl } from './'

export function MediatorsCtrl ($scope, $uibModal, $location, Api, Alerting, MediatorDisplay) {
  /******************************************************************/
  /**   These are the functions for the Mediators initial load     **/
  /******************************************************************/
  $scope.mediatorSearchString = "";
  const querySuccess = function (mediators) {
    $scope.mediators = mediators
    if (mediators.length === 0) {
      Alerting.AlertAddMsg('bottom', 'warning', 'There are currently no mediators created')
    } else {
      MediatorDisplay.formatMediators(mediators)
    }
  }

  const queryError = function (err) {
    // on error - add server error alert
    Alerting.AlertAddServerMsg(err.status)
  }

  // do the initial request
  Api.Mediators.query(querySuccess, queryError)

  /******************************************************************/
  /**   These are the functions for the Mediators initial load     **/
  /******************************************************************/

  // location provider - load transaction details
  $scope.viewMediatorDetails = function (path, $event) {
    // do mediators details redirection when clicked on TD
    if ($event.target.tagName === 'TD') {
      $location.path(path)
    }
  }

  /***********************************/
  /**   Delete Mediator Functions   **/
  /***********************************/

  const deleteSuccess = function () {
    // On success
    $scope.mediators = Api.Mediators.query(querySuccess, queryError)
    Alerting.AlertAddMsg('top', 'success', 'The Mediator has been deleted successfully')
  }

  const deleteError = function (err) {
    // add the error message
    Alerting.AlertAddMsg('top', 'danger', 'An error has occurred while deleting the Mediator: #' + err.status + ' - ' + err.data)
  }

  $scope.confirmDelete = function (mediator) {
    Alerting.AlertReset()

    const deleteObject = {
      title: 'Delete Mediator',
      button: 'Delete',
      message: 'Are you sure you wish to delete the mediator "' + mediator.name + '"?'
    }

    const modalInstance = $uibModal.open({
      template: confirmModal,
      controller: ConfirmModalCtrl,
      resolve: {
        confirmObject: function () {
          return deleteObject
        }
      }
    })

    modalInstance.result.then(function () {
      // Delete confirmed - delete the user
      mediator.$remove(deleteSuccess, deleteError)
    }, function () {
      // delete cancelled - do nothing
    })
  }

  /***********************************/
  /**   Delete Mediator Functions   **/
  /***********************************/

  $scope.editMediatorConfig = function (mediator) {
    Alerting.AlertReset()

    $uibModal.open({
      template: mediatorConfigModal,
      controller: MediatorConfigModalCtrl,
      resolve: {
        mediator: function () {
          return mediator
        }
      }
    })
  }

  // Mediators table list configuration
  $scope.originalFilteredMediators = [];
  $scope.mediatorStartIndex = 0;

  $scope.mediatorPageSizeOptions = [
      { count: '10', value: '10' },
      { count: '20', value: '20'},
      { count: '50', value: '50' } 
  ];

  $scope.mediatorPageSize = $scope.mediatorPageSizeOptions[0]; // default page size as per AC

  $scope.$watch('mediators', function (newValue, oldValue) {
      if (newValue !== oldValue) {

          if ($scope.mediators.length > 0 && $scope.originalFilteredMediators.length === 0) {
              $scope.originalFilteredMediators = $scope.mediators;

              $scope.mediatorCurrentPage = 1; // default page is first page
              $scope.mediatorLastPage = parseInt(Math.ceil($scope.originalFilteredMediators.length / $scope.mediatorPageSize.value)); // calculates the last page

              $scope.mediators = $scope.originalFilteredMediators.slice(0, $scope.mediatorPageSize.value);
          }
          else if ($scope.mediators.length > 0 && $scope.originalFilteredMediators.length > 0 && $scope.mediators.length === $scope.originalFilteredMediators.length) {
              $scope.originalFilteredMediators = [];
              $scope.originalFilteredMediators = $scope.mediators;

              $scope.mediatorLastPage = parseInt(Math.ceil($scope.originalFilteredMediators.length / $scope.mediatorPageSize.value)); // calculates the last page

              var begin = (($scope.mediatorCurrentPage - 1) * $scope.mediatorPageSize.value);
              $scope.mediatorStartIndex = begin;
              var end = begin + parseInt($scope.mediatorPageSize.value);

              if (parseInt(end) > $scope.originalFilteredMediators.length) {
                  // set the last item index to length of array
                  end = $scope.originalFilteredMediators.length;
              }

              $scope.mediators = $scope.originalFilteredMediators.slice(begin, end);
          } else {
            var begin = (($scope.mediatorCurrentPage - 1) * $scope.mediatorPageSize.value);
            var end = begin + parseInt($scope.mediatorPageSize.value);
            $scope.mediatorStartIndex = begin;
          }
      }
  }, true);

  // Change page size
  $scope.mediatorPageSizeChanged = function () {
    var begin = 0; // if you change page size anytime it always starts from begining
    var end =  parseInt($scope.mediatorPageSize.value);
  
    $scope.mediatorCurrentPage = 1; // reset current page from the start
    $scope.mediatorLastPage = parseInt(Math.ceil($scope.originalFilteredMediators.length / $scope.mediatorPageSize.value)); // re-calculates the last page
    $scope.mediators = $scope.originalFilteredMediators.slice(begin, end);
  };

  // Change of page number
  $scope.mediatorPageNoChanged = function (value) {
    // evaluates what is your current situation and can page no be changed?
    if ($scope.mediatorCurrentPage === 1 && value < -1) {
        //console.log("you can't request page change");
        // if you are on FIRST page and requested FIRST page
        return;
    }
    else if ($scope.mediatorCurrentPage === $scope.mediatorLastPage && value > 1) {
        //console.log("you can't request page change");
        // if you are on LAST page and requested LAST page
        return;
    }
    else if ($scope.mediatorCurrentPage === 1 && value === -1) {
        //console.log("you can't request page change");
        // if you are on FIRST page and requested previous page
        return;
    }
    else if ($scope.mediatorCurrentPage === $scope.mediatorLastPage && value === 1) {
        //console.log("you can't request page change");
        // if you are on LAST page and requested next page
        return;
    }

    // evaluates what change in page no is requested?
    if (value > 1) {
        // if last page is requested
        $scope.mediatorCurrentPage = $scope.mediatorLastPage;
    }
    else if (value < -1) {
        // if first page is requested
        $scope.mediatorCurrentPage = parseInt(1);
    }
    else {
        // next or previous page are requested
        $scope.mediatorCurrentPage = parseInt($scope.mediatorCurrentPage) + parseInt(value);
    }

    var begin = (($scope.mediatorCurrentPage - 1) * $scope.mediatorPageSize.value);
    var end = begin + parseInt($scope.mediatorPageSize.value);

    if (parseInt(end) > $scope.originalFilteredMediators.length) {
        // set the last item index to length of array
        end = $scope.originalFilteredMediators.length;
    }

    $scope.mediators = $scope.originalFilteredMediators.slice(begin, end);
};
}
