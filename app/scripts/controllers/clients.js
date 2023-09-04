import clientsmodal from "~/views/clientsmodal";
import confirmModal from "~/views/confirmModal";
import { ClientsModalCtrl, ConfirmModalCtrl } from "./";

export function ClientsCtrl(
  $rootScope,
  $scope,
  $uibModal,
  $interval,
  Api,
  Alerting,
  Notify
) {
  $scope.clientSearchString = "";
  $scope.roleSearchString = "";
  const queryError = function (err) {
    Alerting.AlertAddServerMsg(err.status); // on error - add server error alert
  };

  /* -------------------------Load Clients---------------------------- */
  const clientQuerySuccess = function (clients) {
    $scope.clients = clients;
    if (clients.length === 0) {
      Alerting.AlertAddMsg(
        "bottom",
        "warning",
        "There are currently no clients created"
      );
    }
  };

  const loadRoles = function () {
    const roleQuerySuccess = function (roles) {
      $scope.roles = roles;
      if (roles.length === 0) {
        Alerting.AlertAddMsg(
          "bottom",
          "warning",
          "There are currently no roles created"
        );
      } else {
        Alerting.AlertReset("bottom");
      }
    };

    Api.Roles.query(roleQuerySuccess, queryError); // request roles

    $scope.$on("rolesChanged", function () {
      Api.Roles.query(roleQuerySuccess, queryError); // listen for changed roles and reload roles
    });
  };

  Api.Clients.query(clientQuerySuccess, queryError);

  $scope.$on("clientsChanged", function () {
    Api.Clients.query(clientQuerySuccess, queryError);
    loadRoles();
  });
  /* -------------------------End Load Clients---------------------------- */

  /* -------------------------Add/edit client popup modal---------------------------- */
  $scope.addClient = function () {
    Alerting.AlertReset();
    $scope.serverRestarting = false;

    $uibModal.open({
      template: clientsmodal,
      controller: ClientsModalCtrl,
      resolve: {
        client: function () {},
      },
    });
  };

  $scope.editClient = function (client) {
    Alerting.AlertReset();
    $scope.serverRestarting = false;

    $uibModal.open({
      template: clientsmodal,
      controller: ClientsModalCtrl,
      resolve: {
        client: function () {
          return client;
        },
      },
    });
  };
  /* -------------------------End Add/edit client popup modal---------------------------- */

  /* ------------------------------------------------------------------- */
  /* ----------------------------------Roles---------------------------- */
  $scope.addNewRole = false;
  $scope.newRoles = [];
  $scope.newRolesIndex = 0;

  const apiCall = function (method, parameters, body, callback) {
    const success = function () {
      callback(null, body);
    };

    const error = function (err) {
      callback(err);
    };

    switch (method) {
      case "update":
        Api.Roles.update(parameters, body, success, error);
        break;
      case "save":
        Api.Roles.save(parameters, body, success, error);
        break;
      case "remove":
        Api.Roles.remove(parameters, body, success, error);
        break;
    }
  };

  /* -------------------------Load Channels---------------------------- */
  const channelQuerySuccess = function (channels) {
    $scope.channels = channels;
    if (channels.length === 0) {
      Alerting.AlertAddMsg(
        "bottom",
        "warning",
        "There are currently no channels created"
      );
    } else {
      Alerting.AlertReset("bottom");
    }
  };

  Api.Channels.query(channelQuerySuccess, queryError); // request channels for table columns
  /* -------------------------End Load Channels---------------------------- */

  /* -------------------------Load Roles---------------------------- */
  $scope.$watch("channels", function (newVal) {
    if (newVal) {
      loadRoles(); // channels need to be loaded before roles to set up the table columns
    }
  });
  /* -------------------------End Load Roles---------------------------- */

  /* -------------------------Assign Clients to Roles---------------------------- */
  const buildClientsRolesObject = function () {
    $scope.clientRoles = {};
    angular.forEach($scope.roles, function (role) {
      for (let i = 0; i < role.clients.length; i++) {
        $scope.clientRoles[role.clients[i].clientID + role.name] = true;
      }
    });
  };

  const buildChannelsRolesObject = function () {
    $scope.channelRoles = {};
    angular.forEach($scope.channels, function (channel) {
      angular.forEach($scope.roles, function (role) {
        for (let i = 0; i < role.channels.length; i++) {
          if (role.channels[i]._id === channel._id) {
            $scope.channelRoles[channel.name + role.name] = true;
          }
        }
      });
    });
  };

  const waitForRoles = function () {
    $scope.$watch("roles", function (newVal) {
      if (newVal) {
        buildClientsRolesObject();
        buildChannelsRolesObject();
        angular.forEach($scope.roles, function (role) {
          role.displayName = role.name;
        });
      }
    });
  };

  $scope.$watch("clients", function (newVal) {
    if (newVal) {
      waitForRoles(); // wait for roles before assigning clients
    }
  });

  const editRoleCallback = function (err) {
    if (err) {
      Alerting.AlertReset();
      return Alerting.AlertAddMsg(
        "role",
        "danger",
        "An error has occurred while saving the roles' details: #" +
          err.status +
          " - " +
          err.data
      );
    }
    Alerting.AlertReset();
    Notify.notify("clientsChanged");
  };

  $scope.assignRoleToClient = function (client, role, save) {
    if (!role.clients) {
      role.clients = [];
    }
    role.clients.push({ _id: client._id, name: client.clientID });
    $scope.clientRoles[client.clientID + role.name] = true;

    const updateBody = angular.copy(role);
    updateBody.name = undefined;
    if (save) {
      apiCall("update", { name: role.name }, updateBody, editRoleCallback);
    }
  };

  $scope.removeRoleFromClient = function (client, role, save) {
    $scope.clientRoles[client.clientID + role.name] = false;

    let index = -1;
    for (let i = 0; i < role.clients.length; i++) {
      if (role.clients[i].clientID === client.clientID) {
        index = i;
        break;
      }
    }
    role.clients.splice(index, 1);

    const updateBody = angular.copy(role);
    updateBody.name = undefined;
    if (save) {
      apiCall("update", { name: role.name }, updateBody, editRoleCallback);
    }
  };

  $scope.toggleEditClients = function () {
    $scope.editClients = $scope.editClients !== true;
  };
  /* -------------------------End Assign Clients to Roles---------------------------- */

  /* -------------------------Assign Roles To Channels---------------------------- */
  $scope.assignRoleToChannel = function (channel, role, save) {
    if (!role.channels) {
      role.channels = []; // if the role has no channels, initialize the array
    }
    role.channels.push({ _id: channel._id, name: channel.name });
    $scope.channelRoles[channel.name + role.name] = true;

    const updateBody = angular.copy(role);
    updateBody.name = undefined;
    if (save) {
      apiCall("update", { name: role.name }, updateBody, editRoleCallback);
    }
  };

  $scope.removeAssignRoleFromChannel = function (channel, role, save) {
    $scope.channelRoles[channel.name + role.name] = false;
    let index = -1;
    for (let i = 0; i < role.channels.length; i++) {
      if (role.channels[i].name === channel.name) {
        index = i;
        break;
      }
    }
    role.channels.splice(index, 1);

    const updateBody = angular.copy(role);
    updateBody.name = undefined;
    if (save) {
      apiCall("update", { name: role.name }, updateBody, editRoleCallback);
    }
  };
  /* -------------------------End Assign Roles To Channels---------------------------- */

  /* -------------------------Edit Roles---------------------------- */

  $scope.nameSaved = [];
  $scope.changeRoleName = function (role) {
    try {
      angular.forEach($scope.roles, function (aRole) {
        if (aRole.name === role.displayName) {
          throw new Error("break");
        }
      });
      const updateBody = {};
      updateBody.name = role.displayName;
      $scope.nameSaved[role.displayName] = true;
      apiCall("update", { name: role.name }, updateBody, editRoleCallback);
    } catch (e) {
      $scope.nameSaved[role.displayName] = true;
    }
  };

  $scope.toggleEditRoleNames = function () {
    $scope.editRoleNames = $scope.editRoleNames !== true;
    $scope.nameSaved = [];
  };

  $scope.addRole = function () {
    Alerting.AlertReset();
    $scope.newRoles.push({
      idName: "Role" + $scope.newRolesIndex,
      index: $scope.newRolesIndex++,
      name: $scope.newRoles.name,
    });
  };

  $scope.assignClientToNewRole = function (client, role) {
    if (!role.name) {
      Alerting.AlertReset();
      return Alerting.AlertAddMsg(
        "role",
        "danger",
        "Please name the Role before assigning Clients/Channels"
      );
    }
    if (!role.clients) {
      role.clients = []; // if the role has no clients, initialize the array
    }
    role.clients.push({ _id: client._id, name: client.clientID });
    $scope.clientRoles[client.clientID + role.name] = true;
  };

  $scope.assignNewRoleToChannel = function (channel, role) {
    if (!role.name) {
      Alerting.AlertReset();
      return Alerting.AlertAddMsg(
        "role",
        "danger",
        "Please name the Role before assigning Clients/Channels"
      );
    }
    if (!role.channels) {
      role.channels = []; // if the role has no channels, initialize the array
    }
    role.channels.push({ _id: channel._id, name: channel.name });
    $scope.channelRoles[channel.name + role.name] = true;
  };

  const saveNewRoleCallback = function (err, role) {
    if (err) {
      Alerting.AlertReset();
      return Alerting.AlertAddMsg(
        "role",
        "danger",
        "Saving new role failed: " + err.data
      );
    }
    Alerting.AlertReset();
    Alerting.AlertAddMsg(
      "role",
      "success",
      'Role with name "' + role.name + '" successfully created.'
    );
    Notify.notify("clientsChanged");
    $scope.removeNewRole(role);
  };

  $scope.saveNewRole = function (role) {
    apiCall("save", { name: null }, role, saveNewRoleCallback);
  };

  $scope.removeNewRole = function (role) {
    let spliceIndex = -1;

    for (let i = 0; i < $scope.newRoles.length; i++) {
      if ($scope.newRoles[i].name === role.name) {
        spliceIndex = i;
        break;
      }
    }
    $scope.newRoles.splice(spliceIndex, 1);
  };

  const removeRoleCallback = function (err) {
    if (err) {
      Alerting.AlertReset();
      return Alerting.AlertAddMsg(
        "role",
        "danger",
        "An error has occurred while deleting the role: #" +
          err.status +
          " - " +
          err.data
      );
    }
    Notify.notify("rolesChanged");
    Notify.notify("clientsChanged");
    Alerting.AlertReset();
    Alerting.AlertAddMsg(
      "role",
      "success",
      "The role has been deleted successfully"
    );
  };

  const removeRole = function (role) {
    apiCall("remove", { name: role.name }, null, removeRoleCallback);
    let spliceIndex = -1;
    for (let i = 0; i < $scope.roles.length; i++) {
      if ($scope.roles[i].name === role.name) {
        spliceIndex = i;
        break;
      }
    }
    $scope.roles.splice(spliceIndex, 1);
  };

  /* -------------------------End Edit Roles---------------------------- */

  /* ------------------------Delete Confirm---------------------------- */
  const confirmDelete = function (object, objectType, callback) {
    Alerting.AlertReset();
    $scope.serverRestarting = false;

    const deleteObject = {
      title: "Delete " + objectType,
      button: "Delete",
      message:
        'Are you sure you wish to delete the "' +
        objectType +
        '": "' +
        object.name +
        '"?',
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
        // Delete confirmed - delete the object
        callback();
      },
      function () {
        // delete cancelled - do nothing
      }
    );
  };

  const clientDeleteSuccess = function () {
    $scope.clients = Api.Clients.query();
    Alerting.AlertReset();
    Alerting.AlertAddMsg(
      "client",
      "success",
      "The client has been deleted successfully"
    );
  };

  const clientDeleteError = function (err) {
    Alerting.AlertReset();
    Alerting.AlertAddMsg(
      "client",
      "danger",
      "An error has occurred while deleting the client: #" +
        err.status +
        " - " +
        err.data
    );
  };

  $scope.confirmRoleDelete = function (role) {
    confirmDelete(role, "Role", function () {
      removeRole(role);
    });
  };

  $scope.confirmClientDelete = function (client) {
    confirmDelete(client, "Client", function () {
      client.$remove(clientDeleteSuccess, clientDeleteError);
    });
  };
  /* ------------------------End Delete Confirm---------------------------- */

  // Clients and Role table list configuration
  $scope.originalFilteredClients = [];
  $scope.originalFilteredRoles = [];
  $scope.clientStartIndex = 0;
  $scope.roleStartIndex = 0;

  $scope.clientPageSizeOptions = [
      { count: '10', value: '10' },
      { count: '20', value: '20'},
      { count: '50', value: '50' } 
  ];

  $scope.rolePageSizeOptions = [
      { count: '10', value: '10' },
      { count: '20', value: '20'},
      { count: '50', value: '50' } 
  ];

  $scope.clientPageSize = $scope.clientPageSizeOptions[0]; // default page size as per AC
  $scope.rolePageSize = $scope.rolePageSizeOptions[0]; // default page size as per AC


  // Clients specific logic
  $scope.$watch('clients', function (newValue, oldValue) {
      if (newValue !== oldValue) {

          if ($scope.clients.length > 0 && $scope.originalFilteredClients.length === 0) {
              $scope.originalFilteredClients = $scope.clients;

              $scope.clientCurrentPage = 1; // default page is first page
              $scope.clientLastPage = parseInt(Math.ceil($scope.originalFilteredClients.length / $scope.clientPageSize.value)); // calculates the last page

              $scope.clients = $scope.originalFilteredClients.slice(0, $scope.clientPageSize.value);
          }
          else if ($scope.clients.length > 0 && $scope.originalFilteredClients.length > 0 && $scope.clients.length === $scope.originalFilteredClients.length) {
              $scope.originalFilteredClients = [];
              $scope.originalFilteredClients = $scope.clients;

              $scope.clientLastPage = parseInt(Math.ceil($scope.originalFilteredClients.length / $scope.clientPageSize.value)); // calculates the last page

              var begin = (($scope.clientCurrentPage - 1) * $scope.clientPageSize.value);
              $scope.clientStartIndex = begin;
              var end = begin + parseInt($scope.clientPageSize.value);

              if (parseInt(end) > $scope.originalFilteredClients.length) {
                  // set the last item index to length of array
                  end = $scope.originalFilteredClients.length;
              }

              $scope.clients = $scope.originalFilteredClients.slice(begin, end);
          } else {
            var begin = (($scope.clientCurrentPage - 1) * $scope.clientPageSize.value);
            var end = begin + parseInt($scope.clientPageSize.value);
            $scope.clientStartIndex = begin;
          }
      }
  }, true);

  // Change page size
  $scope.clientPageSizeChanged = function () {
    var begin = 0; // if you change page size anytime it always starts from begining
    var end =  parseInt($scope.clientPageSize.value);
  
    $scope.clientCurrentPage = 1; // reset current page from the start
    $scope.clientLastPage = parseInt(Math.ceil($scope.originalFilteredClients.length / $scope.clientPageSize.value)); // re-calculates the last page
    $scope.clients = $scope.originalFilteredClients.slice(begin, end);
  };

  // Change of page number
  $scope.clientPageNoChanged = function (value) {
    // evaluates what is your current situation and can page no be changed?
    if ($scope.clientCurrentPage === 1 && value < -1) {
        //console.log("you can't request page change");
        // if you are on FIRST page and requested FIRST page
        return;
    }
    else if ($scope.clientCurrentPage === $scope.clientLastPage && value > 1) {
        //console.log("you can't request page change");
        // if you are on LAST page and requested LAST page
        return;
    }
    else if ($scope.clientCurrentPage === 1 && value === -1) {
        //console.log("you can't request page change");
        // if you are on FIRST page and requested previous page
        return;
    }
    else if ($scope.clientCurrentPage === $scope.clientLastPage && value === 1) {
        //console.log("you can't request page change");
        // if you are on LAST page and requested next page
        return;
    }

    // evaluates what change in page no is requested?
    if (value > 1) {
        // if last page is requested
        $scope.clientCurrentPage = $scope.clientLastPage;
    }
    else if (value < -1) {
        // if first page is requested
        $scope.clientCurrentPage = parseInt(1);
    }
    else {
        // next or previous page are requested
        $scope.clientCurrentPage = parseInt($scope.clientCurrentPage) + parseInt(value);
    }

    var begin = (($scope.clientCurrentPage - 1) * $scope.clientPageSize.value);
    var end = begin + parseInt($scope.clientPageSize.value);

    if (parseInt(end) > $scope.originalFilteredClients.length) {
        // set the last item index to length of array
        end = $scope.originalFilteredClients.length;
    }

    $scope.clients = $scope.originalFilteredClients.slice(begin, end);
};

// Roles specific logic
$scope.$watch('roles', function (newValue, oldValue) {
  if (newValue !== oldValue) {

      if ($scope.roles.length > 0 && $scope.originalFilteredRoles.length === 0) {
          $scope.originalFilteredRoles = $scope.roles;

          $scope.roleCurrentPage = 1; // default page is first page
          $scope.roleLastPage = parseInt(Math.ceil($scope.originalFilteredRoles.length / $scope.rolePageSize.value)); // calculates the last page

          $scope.roles = $scope.originalFilteredRoles.slice(0, $scope.rolePageSize.value);
      }
      else if ($scope.roles.length > 0 && $scope.originalFilteredRoles.length > 0 && $scope.roles.length === $scope.originalFilteredRoles.length) {
          $scope.originalFilteredRoles = [];
          $scope.originalFilteredRoles = $scope.roles;

          $scope.roleLastPage = parseInt(Math.ceil($scope.originalFilteredRoles.length / $scope.rolePageSize.value)); // calculates the last page

          var begin = (($scope.roleCurrentPage - 1) * $scope.rolePageSize.value);
          $scope.roleStartIndex = begin;
          var end = begin + parseInt($scope.rolePageSize.value);

          if (parseInt(end) > $scope.originalFilteredRoles.length) {
              // set the last item index to length of array
              end = $scope.originalFilteredRoles.length;
          }

          $scope.roles = $scope.originalFilteredRoles.slice(begin, end);
      } else {
        var begin = (($scope.roleCurrentPage - 1) * $scope.rolePageSize.value);
        var end = begin + parseInt($scope.rolePageSize.value);
        $scope.roleStartIndex = begin;
      }
  }
}, true);

// Change page size
$scope.rolePageSizeChanged = function () {
var begin = 0; // if you change page size anytime it always starts from begining
var end =  parseInt($scope.rolePageSize.value);

$scope.roleCurrentPage = 1; // reset current page from the start
$scope.roleLastPage = parseInt(Math.ceil($scope.originalFilteredRoles.length / $scope.rolePageSize.value)); // re-calculates the last page
$scope.roles = $scope.originalFilteredRoles.slice(begin, end);
};

// Change of page number
$scope.rolePageNoChanged = function (value) {
// evaluates what is your current situation and can page no be changed?
if ($scope.roleCurrentPage === 1 && value < -1) {
    //console.log("you can't request page change");
    // if you are on FIRST page and requested FIRST page
    return;
}
else if ($scope.roleCurrentPage === $scope.roleLastPage && value > 1) {
    //console.log("you can't request page change");
    // if you are on LAST page and requested LAST page
    return;
}
else if ($scope.roleCurrentPage === 1 && value === -1) {
    //console.log("you can't request page change");
    // if you are on FIRST page and requested previous page
    return;
}
else if ($scope.roleCurrentPage === $scope.roleLastPage && value === 1) {
    //console.log("you can't request page change");
    // if you are on LAST page and requested next page
    return;
}

// evaluates what change in page no is requested?
if (value > 1) {
    // if last page is requested
    $scope.roleCurrentPage = $scope.roleLastPage;
}
else if (value < -1) {
    // if first page is requested
    $scope.roleCurrentPage = parseInt(1);
}
else {
    // next or previous page are requested
    $scope.roleCurrentPage = parseInt($scope.roleCurrentPage) + parseInt(value);
}

var begin = (($scope.roleCurrentPage - 1) * $scope.rolePageSize.value);
var end = begin + parseInt($scope.rolePageSize.value);

if (parseInt(end) > $scope.originalFilteredRoles.length) {
    // set the last item index to length of array
    end = $scope.originalFilteredRoles.length;
}

$scope.roles = $scope.originalFilteredRoles.slice(begin, end);
};
}
