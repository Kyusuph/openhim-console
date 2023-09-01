import channelsmodal from "~/views/channelsmodal";
import confirmModal from "~/views/confirmModal";
import { ChannelsModalCtrl, ConfirmModalCtrl } from "./";

export function ChannelsCtrl($scope, $uibModal, Api, Alerting) {
  $scope.channelSearchString = "";

  /* -------------------------Initial load & onChanged---------------------------- */
  const querySuccess = function (channels) {
    $scope.channels = channels;
    $scope.filteredChannels = channels;
    if (channels.length === 0) {
      Alerting.AlertAddMsg(
        "bottom",
        "warning",
        "There are currently no channels created"
      );
    }
  };

  $scope.selectedChannelClient = "";
  $scope.filteredChannels = [];

  const clientQuerySuccess = function (clients) {
    $scope.channelClients = clients;
    // if (clients.length === 0) {
    //   Alerting.AlertAddMsg('bottom', 'warning', 'There are currently no clients created')
    // }
  };
  $scope.applyClientFilterOnChannelsTable = function (client) {
    if (client != "") {
      const _channelClients = $scope.channelClients.filter((cClient) => {
        return cClient._id === client;
      });
      if (_channelClients.length === 0) {
        $scope.filteredChannels = $scope.channels;
        return;
      }
      $scope.filteredChannels = $scope.channels.filter((channel) => {
        for (const allowed of channel.allow) {
          if (_channelClients[0].roles.includes(allowed)) {
            return true;
          }
        }
        return false;
      });
    } else {
      $scope.filteredChannels = $scope.channels;
    }
  };

  const queryError = function (err) {
    // on error - add server error alert
    Alerting.AlertAddServerMsg(err.status);
  };

  // do the initial request
  Api.Channels.query(querySuccess, queryError);
  Api.Clients.query(clientQuerySuccess, queryError);

  $scope.$on("channelsChanged", function () {
    Api.Channels.query(querySuccess, queryError);
  });
  /* -------------------------Initial load & onChanged---------------------------- */

  /* -------------------------Add/edit user popup modal---------------------------- */
  $scope.addChannel = function () {
    Alerting.AlertReset();

    $uibModal.open({
      template: channelsmodal,
      controller: ChannelsModalCtrl,
      resolve: {
        channel: function () {},
        channelDuplicate: function () {},
        tab: function () {},
      },
    });
  };

  $scope.editChannel = function (channel, tab) {
    Alerting.AlertReset();

    $uibModal.open({
      template: channelsmodal,
      controller: ChannelsModalCtrl,
      resolve: {
        channel: function () {
          return channel;
        },
        channelDuplicate: function () {},
        tab: function () {
          return tab;
        },
      },
    });
  };

  $scope.duplicateChannel = function (channel) {
    Alerting.AlertReset();

    $uibModal.open({
      template: channelsmodal,
      controller: ChannelsModalCtrl,
      resolve: {
        channel: function () {},
        channelDuplicate: function () {
          return channel._id;
        },
        tab: function () {},
      },
    });
  };
  /* -------------------------Add/edit user popup modal---------------------------- */

  /* --------------------------Delete Confirm---------------------------- */
  const deleteSuccess = function () {
    // On success
    $scope.channels = Api.Channels.query();
    $scope.filteredChannels = $scope.channels;
    Alerting.AlertAddMsg(
      "top",
      "success",
      "The channel has been deleted successfully"
    );
  };

  const deleteError = function (err) {
    // add the error message
    Alerting.AlertAddMsg(
      "top",
      "danger",
      "An error has occurred while deleting the channel: #" +
        err.status +
        " - " +
        err.data
    );
  };

  $scope.confirmDelete = function (channel) {
    Alerting.AlertReset();

    const deleteObject = {
      title: "Delete Channel",
      button: "Delete",
      message:
        'Are you sure you wish to delete the channel "' + channel.name + '"?',
    };

    const modalInstance = $uibModal.open({
      template: confirmModal,
      controller: ConfirmModalCtrl,
      resolve: {
        confirmObject: function () {
          return deleteObject;
        },
      },
    });

    modalInstance.result.then(
      function () {
        // Delete confirmed - delete the user
        channel.$remove(deleteSuccess, deleteError);
      },
      function () {
        // delete cancelled - do nothing
      }
    );
  };
  /* ---------------------------Delete Confirm---------------------------- */

  /* --------------------------Restore Confirm---------------------------- */
  const restoreSuccess = function () {
    // On success
    $scope.channels = Api.Channels.query();
    $scope.filteredChannels = $scope.channels;
    Alerting.AlertAddMsg(
      "top",
      "success",
      "The channel has been successfully restored"
    );
  };

  const restoreError = function (err) {
    // add the error message
    Alerting.AlertAddMsg(
      "top",
      "danger",
      "An error has occurred while restoring the channel: #" +
        err.status +
        " - " +
        err.data
    );
  };

  $scope.confirmRestore = function (channel) {
    Alerting.AlertReset();

    const restoreObject = {
      title: "Restore Channel",
      button: "Restore",
      message:
        'Are you sure you want to restore the deleted channel "' +
        channel.name +
        '"?',
    };

    const modalInstance = $uibModal.open({
      template: confirmModal,
      controller: ConfirmModalCtrl,
      resolve: {
        confirmObject: function () {
          return restoreObject;
        },
      },
    });

    modalInstance.result.then(
      function () {
        // restore confirmed
        channel.status = "enabled";
        channel.$update(restoreSuccess, restoreError);
      },
      function () {
        // restore cancelled - do nothing
      }
    );
  };

  /* --------------------------Update priority Level---------------------------- */
  $scope.updateChannelPriority = function (channel, direction) {
    let newPriority;
    const curPriority = channel.priority;
    if (!curPriority) {
      newPriority = $scope.getLowestPriority() + 1;
    } else {
      // set priority to lower number ( minus 1 )
      if (direction === "up") {
        if (curPriority === 1) {
          return;
        }

        newPriority = curPriority - 1;
      } else {
        newPriority = curPriority + 1;
      }
    }

    channel.priority = newPriority;
    channel.$update(
      function () {
        // reload channels
        $scope.$broadcast("channelsChanged");
      },
      function (err) {
        Alerting.AlertAddMsg(
          "top",
          "danger",
          "An error has occurred while updating the channel: #" +
            err.status +
            " - " +
            err.data
        );
      }
    );
  };

  $scope.getLowestPriority = function () {
    let lowestPriority = 0;
    for (let i = 0; i < $scope.channels.length; i++) {
      if (
        $scope.channels[i].priority &&
        $scope.channels[i].priority > lowestPriority
      ) {
        lowestPriority = $scope.channels[i].priority;
      }
    }
    return lowestPriority;
  };

  // Channels table list configuration
  $scope.originalItems = [];
  $scope.channelStartIndex = 0;

  $scope.pageSizeOptions = [
      { count: '10', value: '10' },
      { count: '20', value: '20'},
      { count: '50', value: '50' } 
  ];

  $scope.pageSize = $scope.pageSizeOptions[0]; // default page size as per AC

  $scope.$watch('filteredChannels', function (newValue, oldValue) {
      if (newValue !== oldValue) {

          if ($scope.filteredChannels.length > 0 && $scope.originalItems.length === 0) {
              $scope.originalItems = $scope.filteredChannels;

              $scope.currentPage = 0; // default page is first page
              $scope.lastPage = parseInt(Math.ceil($scope.originalItems.length / $scope.pageSize.value)); // calculates the last page

              $scope.filteredChannels = $scope.originalItems.slice(0, $scope.pageSize.value);
          }
          else if ($scope.filteredChannels.length > 0 && $scope.originalItems.length > 0 && $scope.filteredChannels.length === $scope.originalItems.length) {
              $scope.originalItems = [];
              $scope.originalItems = $scope.filteredChannels;

              $scope.lastPage = parseInt(Math.ceil($scope.originalItems.length / $scope.pageSize.value)); // calculates the last page

              var begin = (($scope.currentPage - 1) * $scope.pageSize.value);
              $scope.channelStartIndex = begin;
              var end = begin + parseInt($scope.pageSize.value);

              if (parseInt(end) > $scope.originalItems.length) {
                  // set the last item index to length of array
                  end = $scope.originalItems.length;
              }

              $scope.filteredChannels = $scope.originalItems.slice(begin, end);
          }
      }
  }, true);

  // Change page size
  $scope.pageSizeChanged = function () {
    var begin = 0; // if you change page size anytime it always starts from begining
    var end =  parseInt($scope.pageSize.value);
  
    $scope.currentPage = 1; // reset current page from the start
    $scope.lastPage = parseInt(Math.ceil($scope.originalItems.length / $scope.pageSize.value)); // re-calculates the last page
    $scope.filteredChannels = $scope.originalItems.slice(begin, end);
  };

  // Change of page number
  $scope.pageNoChanged = function (value) {
    // evaluates what is your current situation and can page no be changed?
    if ($scope.currentPage === 1 && value < -1) {
        //console.log("you can't request page change");
        // if you are on FIRST page and requested FIRST page
        return;
    }
    else if ($scope.currentPage === $scope.lastPage && value > 1) {
        //console.log("you can't request page change");
        // if you are on LAST page and requested LAST page
        return;
    }
    else if ($scope.currentPage === 1 && value === -1) {
        //console.log("you can't request page change");
        // if you are on FIRST page and requested previous page
        return;
    }
    else if ($scope.currentPage === $scope.lastPage && value === 1) {
        //console.log("you can't request page change");
        // if you are on LAST page and requested next page
        return;
    }

    // evaluates what change in page no is requested?
    if (value > 1) {
        // if last page is requested
        $scope.currentPage = $scope.lastPage;
    }
    else if (value < -1) {
        // if first page is requested
        $scope.currentPage = parseInt(1);
    }
    else {
        // next or previous page are requested
        $scope.currentPage = parseInt($scope.currentPage) + parseInt(value);
    }

    var begin = (($scope.currentPage - 1) * $scope.pageSize.value);
    var end = begin + parseInt($scope.pageSize.value);

    if (parseInt(end) > $scope.originalItems.length) {
        // set the last item index to length of array
        end = $scope.originalItems.length;
    }

    $scope.filteredChannels = $scope.originalItems.slice(begin, end);
};
}
