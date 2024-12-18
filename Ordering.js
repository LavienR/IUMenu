function processOrders() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    var menuSheet = spreadsheet.getSheetByName("Menu");
  
    //Lấy thời gian hiện tại
    var now = new Date();
    Logger.log("Current Time: " + now);
  
    //Lấy dữ liệu từ sheet "Menu"
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var timeValues = sheet.getRange(2, 6, sheet.getLastRow() - 1, 1).getValues(); //Cột thời gian lấy hàng
    var orderValues = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues(); //Cột "Order"
  
    var sortedData = []; //Mảng chứa đơn hàng đã sắp xếp
  
    //Duyệt qua các đơn hàng và tính toán
    for (var i = 0; i < timeValues.length; i++) {
      if (timeValues[i][0]) {
        var pickupTime = new Date(timeValues[i][0]); //Thời gian lấy hàng
        var timeDiff = (pickupTime - now) / 60000; //Chênh lệch thời gian tính bằng phút
  
        //Kiểm tra nếu chênh lệch thời gian <= 10 mins
        if (timeDiff <= 10) {
          var cellValue = orderValues[i][0];
          if (cellValue) {
            var lines = cellValue.split("\n");
            var totalTime = 0;
  
            lines.forEach(line => {
              var matches = line.match(/^(.*?) \(Kích cỡ: (.*?), Topping: (.*?)\): x(\d+)$/);
              if (matches) {
                var quantity = parseInt(matches[4]);
                var timePerItem = 2; //Thời gian làm 1 món là 2 phút
                totalTime += timePerItem * quantity;
              }
            });
  
            //Thêm dữ liệu vào mảng với timeDiff và totalTime
            sortedData.push({
              rowData: data[i], //Toàn bộ dữ liệu dòng
              timeDiff: timeDiff,
              totalTime: totalTime
            });
          }
        }
      }
    }
  
    //Sắp xếp mảng sortedData trước theo timeDiff, sau đó theo totalTime
    var highPriority = [];
  var lowPriority = [];
  
  //Phân loại vào hai nhóm bằng vòng lặp for
  for (var i = 0; i < sortedData.length; i++) {
    if (sortedData[i].timeDiff < 10) {
      highPriority.push(sortedData[i]);
    } else {
      lowPriority.push(sortedData[i]);
    }
  }
  
  //Sắp xếp nhóm ưu tiên theo timeDiff (gần hơn làm trước)
  for (var i = 0; i < highPriority.length - 1; i++) {
    for (var j = i + 1; j < highPriority.length; j++) {
      if (highPriority[i].timeDiff > highPriority[j].timeDiff) {
        var temp = highPriority[i];
        highPriority[i] = highPriority[j];
        highPriority[j] = temp;
      }
    }
  }
  
  //Sắp xếp nhóm còn lại theo totalTime (lâu hơn làm trước)
  for (var i = 0; i < lowPriority.length - 1; i++) {
    for (var j = i + 1; j < lowPriority.length; j++) {
      if (lowPriority[i].totalTime < lowPriority[j].totalTime) {
        var temp = lowPriority[i];
        lowPriority[i] = lowPriority[j];
        lowPriority[j] = temp;
      }
    }
  }
  
  //Gộp hai nhóm lại thành sortedData
  sortedData = [];
  for (var i = 0; i < highPriority.length; i++) {
    sortedData.push(highPriority[i]);
  }
  for (var i = 0; i < lowPriority.length; i++) {
    sortedData.push(lowPriority[i]);
  }
  
    //Ghi lại dữ liệu đã sắp xếp và totalTime vào sheet
    if (sortedData.length > 0) {
      var finalData = sortedData.map(item => {
        var row = item.rowData.slice(); // Sao chép dữ liệu dòng
        row.push(item.totalTime); // Thêm totalTime vào cột thứ 7
        return row;
      });
  
      //Ghi dữ liệu sắp xếp lại vào sheet "Menu"
      sheet.getRange(2, 1, finalData.length, finalData[0].length).setValues(finalData);
      Logger.log("Orders sorted and written to Menu.");
  
      // Chuyển dữ liệu sang sheet "Order"
      var destinationSheet = spreadsheet.getSheetByName("Order");
      if (!destinationSheet) {
        destinationSheet = spreadsheet.insertSheet("Order");
      }
  
      if (destinationSheet.getLastRow() === 0) {
        destinationSheet.appendRow(['userID', 'telephone', 'order', 'total', 'note', 'date', 'totalTime']); 
      }
  
      var startRow = destinationSheet.getLastRow() + 1;
      destinationSheet.getRange(startRow, 1, finalData.length, finalData[0].length).setValues(finalData);
      Logger.log("Sorted data moved to Order sheet.");
    } else {
      Logger.log("No orders to move.");
    }
  }
  function updateContinuously() {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getActiveSheet();
    var menuSheet = spreadsheet.getSheetByName("Menu");
  
    //Lấy thời gian hiện tại
    var now = new Date();
  
    //Lấy dữ liệu từ sheet "Menu"
    var lastRow = sheet.getLastRow();
    var data = sheet.getRange(2, 1, lastRow - 1, 7).getValues(); // Thêm cột 7 (Processed)
  
    var newOrders = [];
    for (var i = 0; i < data.length; i++) {
      if (data[i][6] !== "Yes" && data[i][5]) { //Nếu chưa xử lý và có thời gian lấy hàng
        var pickupTime = new Date(data[i][5]); //Thời gian lấy hàng (cột 6)
        var timeDiff = (pickupTime - now) / 60000;// Chênh lệch thời gian tính bằng phút
  
        if (timeDiff <= 10) {
          newOrders.push(i + 2); //Lưu chỉ số dòng cần xử lý
        }
      }
    }
  
    if (newOrders.length > 0) {
      Logger.log("Processing new orders...");
      for (var i = 0; i < newOrders.length; i++) {
        var rowIndex = newOrders[i];
        sheet.getRange(rowIndex, 7).setValue("Yes"); 
      } 
      updateContinuously(); 
    } else {
      Logger.log("No new orders to process.");
    }
  }
  function run(){
    processOrders();
   updateContinuously();
  }
  
  