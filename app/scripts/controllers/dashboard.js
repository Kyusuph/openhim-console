import moment from 'moment'

export function DashboardCtrl ($scope, $uibModal, $location, $interval, Api, Alerting, Metrics) {
  const noDataErrorMsg = 'There has been no transactions received for the queried timeframe'

  $scope.selectedDateType = {
    period: '1d'
  }

  let dashboardInterval = $interval(function () {
    $scope.updateMetrics()
  }, 5000)

  function loadMetricsSuccess (metrics) {
    if (metrics.length === 0) {
      Alerting.AlertAddMsg('load', 'warning', noDataErrorMsg)
      Alerting.AlertAddMsg('responseTime', 'warning', noDataErrorMsg)
    } else {
      const round = function (d) {
        return (d).toFixed(2)
      }
      $scope.transactionLoadData = Metrics.buildLineChartData($scope.selectedDateType, metrics, 'total', 'Transactions')
      $scope.transactionResponseTimeData = Metrics.buildLineChartData($scope.selectedDateType, metrics, 'avgResp', 'Response Time (ms)', round)
    }
  }

  function loadMetricsError (err) {
    // add warning message when unable to get data
    Alerting.AlertAddMsg('load', 'danger', 'Transaction Load Error: ' + err.status + ' ' + err.data)
    Alerting.AlertAddMsg('responseTime', 'danger', 'Transaction Load Error: ' + err.status + ' ' + err.data)
  }

  function updateTimeseriesMetrics () {
    // do API call here to pull load metrics
    Api.MetricsTimeseries.query({
      type: $scope.selectedDateType.type,
      startDate: moment($scope.selectedDateType.from).format(),
      endDate: moment($scope.selectedDateType.until).format()
    }, loadMetricsSuccess, loadMetricsError)
  }

  function updateChannelsBarChart (metrics) {
    // set scope variable for amount of active channels
    $scope.activeChannels = metrics.length
    $scope.channelSearchString = "";

    let channelsMap

    // create channelsMap for channels name reference
    Api.Channels.query(function (channels) {
      channelsMap = {}
      angular.forEach(channels, function (channel) {
        channelsMap[channel._id] = channel
      })

      // define varables for graph data set
      let channelGraphStack
      let channelGraphStatus
      const channelsData = []
      const channelStatusGraphData = []
      const channelsKeys = []
      const channelsLabels = []
      const channelsColors = []

      // loop through each channels found in result and construct graph objects
      for (let i = 0; i < metrics.length; i++) {
        channelGraphStack = {}
        channelGraphStatus = {}

        // {"data":[{"label":"Failed","value":"100.00"}],"colors":["#d9534f"]}

        // create a link object for when the user clicks on the bar
        channelGraphStack.link = 'channels/' + metrics[i]._id.channelID
        channelGraphStack.channel = channelsMap[metrics[i]._id.channelID].name
        channelGraphStatus.link = 'channels/' + metrics[i]._id.channelID
        channelGraphStatus.channel = channelsMap[metrics[i]._id.channelID]

        channelGraphStack.processing = metrics[i].processing
        channelGraphStatus.processing = metrics[i].processing

        // only add these if it isnt yet present
        if (channelsKeys.indexOf('processing') === -1) {
          channelsKeys.push('processing')
          channelsLabels.push('Processing')
          channelsColors.push('#777777')
        }

        channelGraphStack.failed = metrics[i].failed
        channelGraphStatus.failed = metrics[i].failed

        // only add these if it isnt yet present
        if (channelsKeys.indexOf('failed') === -1) {
          channelsKeys.push('failed')
          channelsLabels.push('Failed')
          channelsColors.push('#d9534f')
        }

        channelGraphStack.completed = metrics[i].completed
        channelGraphStatus.completed = metrics[i].completed

        // only add these if it isnt yet present
        if (channelsKeys.indexOf('completed') === -1) {
          channelsKeys.push('completed')
          channelsLabels.push('Completed')
          channelsColors.push('#EFC300')
        }

        channelGraphStack.completedWErrors = metrics[i].completedWErrors
        channelGraphStatus.completedWErrors = metrics[i].completedWErrors

        if (channelsKeys.indexOf('completedWErrors') === -1) {
          channelsKeys.push('completedWErrors')
          channelsLabels.push('Completed With Errors')
          channelsColors.push('#FB8B24')
        }

        channelGraphStack.successful = metrics[i].successful
        channelGraphStatus.successful = metrics[i].successful
        channelGraphStatus.total = metrics[i].total

        if (channelsKeys.indexOf('successful') === -1) {
          channelsKeys.push('successful')
          channelsLabels.push('Successful')
          channelsColors.push('#5cb85c')
        }

        channelsData.push(channelGraphStack)
        channelStatusGraphData.push(channelGraphStatus)
      }

      const totalStatusValues = {}
      let totalTransactions = 0
      const channelsDonutData = []
      const channelsDonutColors = []

      // initialize all status with 0 value
      for(let j = 0; j < channelsKeys.length; j++) {
        totalStatusValues[channelsKeys[j]] = 0
      }

      // aggregate all channels transaction by status
      for (let i = 0; i < channelsData.length; i++) {
        const singleChannelData = channelsData[i]
        for(let j = 0; j < channelsKeys.length; j++) {
          totalStatusValues[channelsKeys[j]] += singleChannelData[channelsKeys[j]]
          totalTransactions += singleChannelData[channelsKeys[j]]
        }
      }
      
      // calculate percent from the aggregation by ignoring status with 0 valued
      for(let j = 0; j < channelsKeys.length; j++) {
        if(totalStatusValues[channelsKeys[j]] !== 0) {
          const percent = (100 / totalTransactions * totalStatusValues[channelsKeys[j]]).toFixed(2)
          channelsDonutData.push({label:channelsLabels[j],value:percent})
          channelsDonutColors.push(channelsColors[j])
        }
      }
      $scope.channelsDonutDashboardChartData = {data: channelsDonutData, colors: channelsDonutColors}
      console.log($scope.channelsDonutDashboardChartData)
      $scope.channelsData = { data: channelsData, xkey: 'channel', ykeys: channelsKeys, labels: channelsLabels, colors: channelsColors, stacked: true }
      $scope.channelStatusGraphData = channelStatusGraphData
    },
    function (err) {
      Alerting.AlertAddMsg('status', 'danger', 'Channel Load Error: ' + err.status + ' ' + err.data)
    })
  }

  function channelMetricsSuccess (metrics) {
    if (metrics.length === 0) {
      Alerting.AlertAddMsg('status', 'warning', noDataErrorMsg)
      Alerting.AlertAddMsg('dashboardChannelList', 'warning', noDataErrorMsg)
    } else {
      updateChannelsBarChart(metrics)
    }
  }

  function channelMetricsError (err) {
    // add warning message when unable to get data
    Alerting.AlertAddMsg('status', 'danger', 'Transaction Load Error: ' + err.status + ' ' + err.data)
  }

  function updateChannelMetrics () {
    // do API call here to pull load metrics
    Api.MetricsChannels.query({
      startDate: moment($scope.selectedDateType.from).format(),
      endDate: moment($scope.selectedDateType.until).format()
    }, channelMetricsSuccess, channelMetricsError)
  }

  $scope.updateMetrics = function () {
    Alerting.AlertReset('load')
    Alerting.AlertReset('responseTime')
    Alerting.AlertReset('status')
    Alerting.AlertReset('dashboardChannelList')

    Metrics.refreshDatesForSelectedPeriod($scope.selectedDateType)
    updateTimeseriesMetrics()
    updateChannelMetrics()
  }

  $scope.updateMetrics()

  $scope.$on('$destroy', function () {
    // Make sure that the interval is destroyed too
    if (angular.isDefined(dashboardInterval)) {
      $interval.cancel(dashboardInterval)
      dashboardInterval = undefined
    }
  })
}
