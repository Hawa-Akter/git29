const { LOADIPHLPAPI } = require("dns");
const { ipcMain, BrowserWindow, app, Menu, ipcRenderer } = require("electron");
const fetch = require("node-fetch");
const FormData = require("form-data");
let childWin;

//database connection
const sqlite3 = require("sqlite3").verbose();

let mainWin;
function createMainWindow() {
  mainWin = new BrowserWindow({
    resizable: true,
    title: "Login - Dhaka Restaurant",
    minimizable: true,
    fullscreenable: true,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });
  mainWin.loadFile("assests/html/index.html");
  mainWin.maximize();
  mainWin.setMenuBarVisibility(false);
}
//place an order
ipcMain.on("PosOrderItems", (e, posItem) => {
  var tokenItems = [];
  var tkenItems = [];

  posItem.map(
    ({
      customerId,
      waiterId,
      tableNo,
      cookingTime,
      orderDate,
      orderTime,
      totalAmount,
      orderDetails,
      tokenDetails,
    }) => {
      tokenDetails.map((tdetails) => {
        tokenItems.push(tdetails);
      });

      const db = new sqlite3.Database("./database.sqlite");
      db.all(`SELECT PosOrder.saleinvoice FROM PosOrder`, [], (err, rows) => {
        if (err) {
          throw err;
        } else {
          if (rows.length === 0) {
            db.run(
              `INSERT INTO PosOrder (saleinvoice, customer_id, customer_type,isthirdparty, waiter_id, kitchen, order_date, order_time, table_no,tokenno,totalamount,customer_note,order_status,cookingtime,order_details) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                "0001",
                1,
                customerId,
                0,
                waiterId,
                0,
                orderDate,
                orderTime,
                tableNo,
                "01",
                totalAmount,
                "",
                2,
                cookingTime,
                orderDetails,
              ],
              function (err) {
                if (err) {
                  return console.log("Error message", err.message);
                }
                console.log(
                  `A row has been inserted with rowid ${this.lastID}`
                );
              }
            );
          } else {
            db.all(
              `SELECT PosOrder.saleinvoice,PosOrder.tokenno,PosOrder.order_date from PosOrder ORDER BY PosOrder.saleinvoice DESC LIMIT 1`,
              [],
              (err, rows) => {
                if (err) {
                  throw err;
                } else {
                  let today = new Date();
                  let posDate =
                    today.getFullYear() +
                    "-" +
                    (today.getMonth() + 1) +
                    "-" +
                    today.getDate();

                  let lastDateFromDb = rows[0].order_date;

                  if (posDate === lastDateFromDb) {
                    let lastInvoiceNo = rows[0].saleinvoice;
                    let lastTokenNo = rows[0].tokenno;

                    let lastTokenNoToInt = parseInt(lastTokenNo);
                    let lastInvoiceToInt = parseInt(lastInvoiceNo);

                    let convertInvoiceToStr = (lastInvoiceToInt + 1).toString();
                    let convertTokenToStr = (lastTokenNoToInt + 1).toString();

                    let invoice = counter(convertInvoiceToStr);
                    let tokenNo = tokenCounter(convertTokenToStr);
                    db.run(
                      `INSERT INTO PosOrder (saleinvoice, customer_id, customer_type,isthirdparty, waiter_id, kitchen, order_date, order_time, table_no,tokenno,totalamount,customer_note,order_status,cookingtime,order_details) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                      [
                        invoice,
                        1,
                        customerId,
                        0,
                        waiterId,
                        0,
                        orderDate,
                        orderTime,
                        tableNo,
                        tokenNo,
                        totalAmount,
                        "",
                        2,
                        cookingTime,
                        orderDetails,
                      ],
                      function (err) {
                        if (err) {
                          return console.log("Error message", err.message);
                        }
                        console.log(
                          `A row has been inserted with rowid ${this.lastID}`
                        );
                      }
                    );
                    tkenItems.push({ invoice, tokenNo });
                  } else {
                    db.all(
                      `SELECT PosOrder.saleinvoice from PosOrder ORDER BY PosOrder.saleinvoice DESC LIMIT 1`,
                      [],
                      (err, rows) => {
                        if (err) {
                          throw err;
                        } else {
                          let lastInvoice = rows[0].saleinvoice;
                          let lastInvoiceToInt = parseInt(lastInvoice);
                          let invoiceConvertionToStr = (
                            lastInvoiceToInt + 1
                          ).toString();
                          let saleInvoice = counter(invoiceConvertionToStr);
                          db.run(
                            `INSERT INTO PosOrder (saleinvoice, customer_id, customer_type,isthirdparty, waiter_id, kitchen, order_date, order_time, table_no,tokenno,totalamount,customer_note,order_status,cookingtime,order_details) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                              saleInvoice,
                              1,
                              customerId,
                              0,
                              waiterId,
                              0,
                              orderDate,
                              orderTime,
                              tableNo,
                              "01",
                              totalAmount,
                              "",
                              2,
                              cookingTime,
                              orderDetails,
                            ],
                            (err) => {
                              if (err) {
                                return console.log(
                                  "Error message",
                                  err.message
                                );
                              }
                              console.log(
                                `A row has been inserted with rowid ${this.lastID}`
                              );
                            }
                          );
                        }
                      }
                    );
                  }
                }
              }
            );
          }
        }
      });

      db.close();
    }
  );

  placedOrderWin = new BrowserWindow({
    width: 500,
    height: 350,
    modal: true,
    show: true,
    parent: mainWin,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  placedOrderWin.loadFile("assests/html/placed_order.html");
  placedOrderWin.setMenuBarVisibility(false);
  placedOrderWin.webContents.openDevTools();

  placedOrderWin.webContents.on("did-finish-load", () => {
    var tokenDetails = [{ tokenItems, tkenItems }];
    placedOrderWin.webContents.send("placedOrderItemsForToken", tokenDetails);
  });
});
function counter(val) {
  var len = val.length;
  if (len == 1) {
    return "000" + val;
  } else if (len == 2) {
    return "00" + val;
  } else if (len == 3) {
    return "0" + val;
  } else {
    return val;
  }
}
function tokenCounter(val) {
  var len = val.length;
  if (len == 1) {
    return "0" + val;
  } else if (len == 2) {
    return val;
  }
}
// function insertionPosOrder(
//   customerId,
//   waiterId,
//   tableNo,
//   cookingTime,
//   orderDate,
//   orderTime,
//   totalAmount,
//   orderDetails
// ) {

// }
//place an order end here

//cart items
ipcMain.on("itemsOnBasket", (e, r) => {
  mainWin.webContents.send("ItemsOnBasketSent", r);
});

//Items in cart
ipcMain.on("foodIdSent", (evt, result) => {
  const db = new sqlite3.Database("./database.sqlite");

  let foods = [];
  let addOns = [];

  const cartItems = `SELECT DISTINCT FoodList.ProductName, VarientList.variantid,VarientList.variantName, VarientList.price, FoodList.ProductsID
  FROM FoodList, VarientList
  WHERE VarientList.menuid = FoodList.ProductsID
   AND FoodList.ProductsID = ? `;

  db.all(cartItems, [result], (err, rows) => {
    if (err) throw err;
    if (rows) {
      rows.map((row) => {
        foods.push(row);
      });
      //mainWin.webContents.send("Without-addson-food-sent", foods);
    }
  });

  const addonItems = `SELECT  DISTINCT AddsOn.add_on_name, AddsOn.add_on_id,AddsOn.price, FoodList.ProductsID
  FROM FoodList, AddsOnAssign, AddsOn
  WHERE AddsOnAssign.menu_id = FoodList.ProductsID
  AND AddsOnAssign.add_on_id= AddsOn.add_on_id
  AND FoodList.ProductsID = ? `;

  db.all(addonItems, [result], (err, rows) => {
    if (err) throw err;
    if (rows) {
      rows.map((row) => {
        addOns.push(row);
      });
    }
  });
  db.close();
  childWin = new BrowserWindow({
    width: 815,
    height: 390,
    modal: true,
    show: true,
    parent: mainWin,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
  });

  childWin.loadFile("assests/html/cart.html");
  childWin.setMenuBarVisibility(false);
  //childWin.webContents.openDevTools();

  childWin.webContents.on("did-finish-load", () => {
    childWin.webContents.send("foodsOnCartSent", foods);
    childWin.webContents.send("addOnCartSent", addOns);
  });
});

//Login page start here
ipcMain.on("authenticated", (event, result) => {
  var data = result;
  var userEmail = data.email;
  var password = data.password;
  validateUser(userEmail, password);
});

function validateUser(userEmail, pass) {
  const db = new sqlite3.Database("./database.sqlite");
  const users = `SELECT email, password FROM user WHERE  email=? AND password=?`;
  db.all(users, [userEmail, pass], (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach((row) => {
      if (row.email == userEmail && row.password == pass) {
        mainWin.setMenuBarVisibility(true);
        //mainWin.webContents.openDevTools();
        return mainWin.loadURL(`file://${__dirname}/assests/html/pos.html`);
      }
    });
    var incorrect = "Password or email is incorrect";
    mainWin.webContents.send("unauthenticatedReply", incorrect);
  });
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
}
// end of login page

//start of POS page

ipcMain.on("categoryNamesLoaded", () => {
  gettingCategoryByNames();
});
function gettingCategoryByNames() {
  const db = new sqlite3.Database("./database.sqlite");
  const categories = `SELECT CategoryID, CategoryList.Name FROM CategoryList`;
  db.all(categories, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("categoryNamesReplySent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
}
ipcMain.on("categoryId", (evt, result) => {
  var categoryId = result;
  gettingfoodByCategory(categoryId);
});

function gettingfoodByCategory(cId) {
  const db = new sqlite3.Database("./database.sqlite");
  var category = [];
  const foodsByCategory = `SELECT FoodList.ProductName,FoodList.ProductsID, FoodList.ProductImage
  FROM FoodList, CategoryList
  WHERE FoodList.CategoryID= CategoryList.CategoryID
    AND CategoryList.CategoryID = ?`;

  db.all(foodsByCategory, [cId], (err, rows) => {
    if (err) {
      throw err;
    }
    if (rows) {
      category.push(rows);
    }
    mainWin.webContents.send("foodsByCategoryReplySent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
}
ipcMain.on("foodByALlCategory", () => {
  gettingFoodByAllCategory();
});
function gettingFoodByAllCategory() {
  const db = new sqlite3.Database("./database.sqlite");

  const foodsByCategory = `SELECT * FROM FoodList`;

  db.all(foodsByCategory, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodsByAllCategoryReplySent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
}
ipcMain.on("foodOnPageLoaded", () => {
  gettingFoodOnPageLoad();
});
function gettingFoodOnPageLoad() {
  const db = new sqlite3.Database("./database.sqlite");

  const foodsOnPageLoad = `SELECT * FROM FoodList`;

  db.all(foodsOnPageLoad, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodOnPageLoadedReplySent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
}

//POS page end here

//food page start here
//foods
ipcMain.on("foodListLoaded", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodList = `SELECT DISTINCT CategoryList.Name,FoodList.ProductName,FoodList.ProductImage,FoodList.component, FoodList.productvat, FoodList.ProductsIsActive
	FROM FoodList, CategoryList
	WHERE FoodList.CategoryID = CategoryList.CategoryID`;

  db.all(foodList, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodsResultSent", rows);
  });

  db.close();
});
// ipcMain.on("foodListLoaded", () => {
//   insertingFoodListTable();
// });
// function insertingFoodListTable() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/foodlist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.foodinfo.map(
//         ({
//           ProductsID,
//           CategoryID,
//           ProductName,
//           ProductImage,
//           bigthumb,
//           medium_thumb,
//           small_thumb,
//           component,
//           descrip,
//           itemnotes,
//           productvat,
//           special,
//           OffersRate,
//           offerIsavailable,
//           offerstartdate,
//           offerendate,
//           Position,
//           ProductsIsActive,
//           UserIDInserted,
//           UserIDUpdated,
//           UserIDLocked,
//           DateInserted,
//           DateUpdated,
//           DateLocked,
//         }) => {
//           insertionFood(
//             ProductsID,
//             CategoryID,
//             ProductName,
//             ProductImage,
//             bigthumb,
//             medium_thumb,
//             small_thumb,
//             component,
//             descrip,
//             itemnotes,
//             productvat,
//             special,
//             OffersRate,
//             offerIsavailable,
//             offerstartdate,
//             offerendate,
//             Position,
//             ProductsIsActive,
//             UserIDInserted,
//             UserIDUpdated,
//             UserIDLocked,
//             DateInserted,
//             DateUpdated,
//             DateLocked
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionFood(
//   ProductsID,
//   CategoryID,
//   ProductName,
//   ProductImage,
//   bigthumb,
//   medium_thumb,
//   small_thumb,
//   component,
//   descrip,
//   itemnotes,
//   productvat,
//   special,
//   OffersRate,
//   offerIsavailable,
//   offerstartdate,
//   offerendate,
//   Position,
//   ProductsIsActive,
//   UserIDInserted,
//   UserIDUpdated,
//   UserIDLocked,
//   DateInserted,
//   DateUpdated,
//   DateLocked
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO FoodList (ProductsID, CategoryID, ProductName, ProductImage, bigthumb, medium_thumb, small_thumb, component,descrip,itemnotes,productvat,special,OffersRate,offerIsavailable,offerstartdate,offerendate,Position,ProductsIsActive,UserIDInserted,UserIDUpdated,UserIDLocked,DateInserted,DateUpdated,DateLocked) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?,?,?,?)`,
//     [
//       ProductsID,
//       CategoryID,
//       ProductName,
//       ProductImage,
//       bigthumb,
//       medium_thumb,
//       small_thumb,
//       component,
//       descrip,
//       itemnotes,
//       productvat,
//       special,
//       OffersRate,
//       offerIsavailable,
//       offerstartdate,
//       offerendate,
//       Position,
//       ProductsIsActive,
//       UserIDInserted,
//       UserIDUpdated,
//       UserIDLocked,
//       DateInserted,
//       DateUpdated,
//       DateLocked,
//     ],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }

//food varient

ipcMain.on("FoodVarient", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodVarientList = `SELECT VarientList.variantName, FoodList.ProductName
	FROM VarientList, FoodList
	WHERE VarientList.menuid = FoodList.ProductsID
  ORDER BY FoodList.ProductName`;

  db.all(foodVarientList, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodVarientResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("FoodVarient", () => {
//   insertingFoodVarientList();
// });
// function insertingFoodVarientList() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/varientlist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.foodvarientinfo.map(
//         ({ variantid, menuid, variantName, price }) => {
//           insertionAvailability(variantid, menuid, variantName, price);
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionVarient(variantid, menuid, variantName, price) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO VarientList (variantid,menuid,variantName,price) VALUES(?, ?, ?, ?)`,
//     [variantid, menuid, variantName, price],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//food availability
ipcMain.on("FoodAvailability", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodAvailabilityList = `SELECT FoodList.ProductName, FoodAvaliality.availday, FoodAvaliality.availtime 
  FROM FoodList, FoodAvaliality
	WHERE FoodAvaliality.foodid = FoodList.ProductsID`;

  db.all(foodAvailabilityList, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodAvailabilityResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("FoodAvailability", () => {
//   insertingFoodAvailabilityList();
// });
// function insertingFoodAvailabilityList() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/foodvariable", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.foodavailableinfo.map(
//         ({ availableID, foodid, availtime, availday, is_active }) => {
//           insertionAvailability(
//             availableID,
//             foodid,
//             availtime,
//             availday,
//             is_active
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionAvailability(
//   availableID,
//   foodid,
//   availtime,
//   availday,
//   is_active
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO FoodAvaliality (availableID,foodid,availtime,availday,is_active) VALUES(?, ?, ?, ?,?)`,
//     [availableID, foodid, availtime, availday, is_active],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }

//end of food page

//start of food addson page
ipcMain.on("foodAddOns", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodAddOns = `SELECT * FROM AddsOn`;

  db.all(foodAddOns, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodAddOnsResultSent", rows);
  });

  db.close();
});
// ipcMain.on("foodAddOns", () => {
//   gettingFoodAddOns();
// });
// function gettingFoodAddOns() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/addonslist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.addonsinfo.map(
//         ({ add_on_id, add_on_name, price, is_active }) => {
//           insertionAddson(add_on_id, add_on_name, price, is_active);
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionAddson(add_on_id, add_on_name, price, is_active) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO AddsOn (add_on_id,add_on_name,price,is_active) VALUES(?, ?, ?,?)`,
//     [add_on_id, add_on_name, price, is_active],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }

//food addson assign
ipcMain.on("foodAddOnsAssign", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodAddOnsAssign = `SELECT  DISTINCT AddsOn.add_on_name,FoodList.ProductName
  FROM AddsOn, AddsOnAssign,FoodList
	WHERE  AddsOnAssign.menu_id = FoodList.ProductsID
	AND AddsOn.add_on_id = AddsOnAssign.add_on_id`;

  db.all(foodAddOnsAssign, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodAddOnsAsssignResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("foodAddOnsAssign", () => {
//   gettingFoodAddOnsAssign();
// });
// function gettingFoodAddOnsAssign() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/addonsassignlist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.addonsinfo.map(({ row_id, menu_id, add_on_id, is_active }) => {
//         insertionAddsonAssign(row_id, menu_id, add_on_id, is_active);
//       });
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionAddsonAssign(row_id, menu_id, add_on_id, is_active) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO AddsOnAssign (row_id,menu_id,add_on_id,is_active) VALUES(?, ?, ?,?)`,
//     [row_id, menu_id, add_on_id, is_active],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//end of food addson page

// food category page
ipcMain.on("foodCategory", () => {
  const db = new sqlite3.Database("./database.sqlite");
  const catgoryList = `SELECT CategoryList.Name,CategoryList.CategoryImage, CategoryList.parentid,CategoryList.CategoryIsActive
	FROM CategoryList`;

  db.all(catgoryList, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodCategoryresultSent", rows);
  });
  db.close();
});
// ipcMain.on("foodCategory", () => {
//   gettingFoodCategory();
// });
// function gettingFoodCategory() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/categorylist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.categoryfo.map(
//         ({
//           CategoryID,
//           Name,
//           CategoryImage,
//           parentid,
//           CategoryIsActive,
//           DateInserted,
//           DateLocked,
//           DateUpdated,
//           Position,
//           UserIDInserted,
//           UserIDLocked,
//           UserIDUpdated,
//           isoffer,
//           offerendate,
//           offerstartdate,
//         }) => {
//           insertingFoodCategory(
//             CategoryID,
//             Name,
//             CategoryImage,
//             parentid,
//             CategoryIsActive,
//             DateInserted,
//             DateLocked,
//             DateUpdated,
//             Position,
//             UserIDInserted,
//             UserIDLocked,
//             UserIDUpdated,
//             isoffer,
//             offerendate,
//             offerstartdate
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertingFoodCategory(
//   CategoryID,
//   Name,
//   CategoryImage,
//   parentid,
//   CategoryIsActive,
//   DateInserted,
//   DateLocked,
//   DateUpdated,
//   Position,
//   UserIDInserted,
//   UserIDLocked,
//   UserIDUpdated,
//   isoffer,
//   offerendate,
//   offerstartdate
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO CategoryList (CategoryID, Name, CategoryImage, parentid, CategoryIsActive, DateInserted, DateLocked, DateUpdated, Position, UserIDInserted, UserIDLocked, UserIDUpdated, isoffer, offerendate, offerstartdate) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       CategoryID,
//       Name,
//       CategoryImage,
//       parentid,
//       CategoryIsActive,
//       DateInserted,
//       DateLocked,
//       DateUpdated,
//       Position,
//       UserIDInserted,
//       UserIDLocked,
//       UserIDUpdated,
//       isoffer,
//       offerendate,
//       offerstartdate,
//     ],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//     }
//   );
//   db.close();
// }

ipcMain.on("tableSent", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodTable = ` SELECT Tables.tablename, Tables.tableid FROM Tables`;

  db.all(foodTable, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("tableReplySent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
//food table page
ipcMain.on("foodTable", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const foodTable = `	SELECT Tables.tablename, Tables.person_capicity, Tables.table_icon
  FROM Tables`;

  db.all(foodTable, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("foodTableResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("foodTable", () => {
//   gettingFoodTable();
// });
// function gettingFoodTable() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/tablelist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.tableinfo.map(
//         ({ tableid, tablename, customer_name, commision }) => {
//           insertionAddsonAssign(
//             tableid,
//             tablename,
//             customer_name,
//             table_icon,
//             status
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionAddsonAssign(
//   tableid,
//   tablename,
//   ordering,
//   table_icon,
//   status
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO Tables (tableid,tablename,person_capicity,table_icon,status) VALUES(?, ?, ?,?,?)`,
//     [tableid, tablename, person_capicity, table_icon, status],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }

// Customer type page
//third party customer

ipcMain.on("thirdPartyCustomer", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const thirdPartyCustomer = `SELECT  ThirdPartyCustomer.company_name, ThirdPartyCustomer.commision, ThirdPartyCustomer.address 
  FROM ThirdPartyCustomer`;

  db.all(thirdPartyCustomer, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("thirdPartyCustomerResultSent", rows);
  });

  db.close();
});

// ipcMain.on("thirdPartyCustomer", () => {
//   gettingThirdPartyCustomer();
// });

// function gettingThirdPartyCustomer() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/thirdpartylist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.thirdpartyinfo.map(
//         ({ companyId, company_name, address, commision }) => {
//           insertionThirdPartyList(companyId, company_name, address, commision);
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionThirdPartyList(companyId, company_name, address, commision) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO ThirdPartyCustomer (companyId,company_name,address,commision) VALUES(?, ?, ?,?)`,
//     [companyId, company_name, address, commision],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }

ipcMain.on("customerTypeDropdownLoaded", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const thirdPartyCustomerTable = `SELECT CustomerTypeList.customer_type, CustomerTypeList.customer_type_id FROM CustomerTypeList ORDER BY CustomerTypeList.customer_type `;

  db.all(thirdPartyCustomerTable, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("customerTypeDropdownLoadedSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
//customer type
ipcMain.on("CustomerType", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const thirdPartyCustomerTable = `SELECT CustomerTypeList.customer_type FROM CustomerTypeList`;

  db.all(thirdPartyCustomerTable, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("customerTypeResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});

// ipcMain.on("CustomerType", () => {
//   gettingCustomerType();
// });
// function gettingCustomerType() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/customertypelist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.customertypeinfo.map(
//         ({ customer_type_id, customer_type, ordering }) => {
//           insertionCustomerTypeList(customer_type_id, customer_type, ordering);
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionCustomerTypeList(customer_type_id, customer_type, ordering) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO CustomerTypeList (customer_type_id, customer_type, ordering) VALUES(?, ?, ?)`,
//     [customer_type_id, customer_type, ordering],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//waiter dropdown
ipcMain.on("waiterDropdown", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const thirdPartyCustomerTable = ` SELECT WaiterList.first_name, WaiterList.emp_his_id
  FROM WaiterList`;

  db.all(thirdPartyCustomerTable, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("waiterListSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});

// ipcMain.on("waiterDropdown", () => {
//   gettingWaiter();
// });
// function gettingWaiter() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/waiterlist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.waiterinfo.map(
//         ({
//           emp_his_id,
//           employee_id,
//           pos_id,
//           first_name,
//           last_name,
//           email,
//           phone,
//           alter_phone,
//           present_address,
//           parmanent_address,
//           picture,
//           degree_name,
//           university_name,
//           cgp,
//           passing_year,
//           company_name,
//           working_period,
//           duties,
//           supervisor,
//           signature,
//           is_admin,
//           dept_id,
//           division_id,
//           maiden_name,
//           state,
//           city,
//           zip,
//           citizenship,
//           duty_type,
//           hire_date,
//           original_hire_date,
//           termination_date,
//           termination_reason,
//           voluntary_termination,
//           rehire_date,
//           rate_type,
//           rate,
//           pay_frequency,
//           pay_frequency_txt,
//           hourly_rate2,
//           hourly_rate3,
//           home_department,
//           department_text,
//           class_code,
//           class_code_desc,
//           class_acc_date,
//           class_status,
//           is_super_visor,
//           super_visor_id,
//           supervisor_report,
//           dob,
//           gender,
//           country,
//           marital_status,
//           ethnic_group,
//           eeo_class_gp,
//           ssn,
//           work_in_state,
//           live_in_state,
//           home_email,
//           business_email,
//           home_phone,
//           business_phone,
//           cell_phone,
//           emerg_contct,
//           emrg_w_phone,
//           emgr_contct_relation,
//           alt_em_contct,
//           alt_emg_h_phone,
//           alt_emg_w_phone,
//         }) => {
//           insertionCustomerTypeList(
//             emp_his_id,
//             employee_id,
//             pos_id,
//             first_name,
//             last_name,
//             email,
//             phone,
//             alter_phone,
//             present_address,
//             parmanent_address,
//             picture,
//             degree_name,
//             university_name,
//             cgp,
//             passing_year,
//             company_name,
//             working_period,
//             duties,
//             supervisor,
//             signature,
//             is_admin,
//             dept_id,
//             division_id,
//             maiden_name,
//             state,
//             city,
//             zip,
//             citizenship,
//             duty_type,
//             hire_date,
//             original_hire_date,
//             termination_date,
//             termination_reason,
//             voluntary_termination,
//             rehire_date,
//             rate_type,
//             rate,
//             pay_frequency,
//             pay_frequency_txt,
//             hourly_rate2,
//             hourly_rate3,
//             home_department,
//             department_text,
//             class_code,
//             class_code_desc,
//             class_acc_date,
//             class_status,
//             is_super_visor,
//             super_visor_id,
//             supervisor_report,
//             dob,
//             gender,
//             country,
//             marital_status,
//             ethnic_group,
//             eeo_class_gp,
//             ssn,
//             work_in_state,
//             live_in_state,
//             home_email,
//             business_email,
//             home_phone,
//             business_phone,
//             cell_phone,
//             emerg_contct,
//             emrg_w_phone,
//             emgr_contct_relation,
//             alt_em_contct,
//             alt_emg_h_phone,
//             alt_emg_w_phone
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionCustomerTypeList(
//   emp_his_id,
//   employee_id,
//   pos_id,
//   first_name,
//   last_name,
//   email,
//   phone,
//   alter_phone,
//   present_address,
//   parmanent_address,
//   picture,
//   degree_name,
//   university_name,
//   cgp,
//   passing_year,
//   company_name,
//   working_period,
//   duties,
//   supervisor,
//   signature,
//   is_admin,
//   dept_id,
//   division_id,
//   maiden_name,
//   state,
//   city,
//   zip,
//   citizenship,
//   duty_type,
//   hire_date,
//   original_hire_date,
//   termination_date,
//   termination_reason,
//   voluntary_termination,
//   rehire_date,
//   rate_type,
//   rate,
//   pay_frequency,
//   pay_frequency_txt,
//   hourly_rate2,
//   hourly_rate3,
//   home_department,
//   department_text,
//   class_code,
//   class_code_desc,
//   class_acc_date,
//   class_status,
//   is_super_visor,
//   super_visor_id,
//   supervisor_report,
//   dob,
//   gender,
//   country,
//   marital_status,
//   ethnic_group,
//   eeo_class_gp,
//   ssn,
//   work_in_state,
//   live_in_state,
//   home_email,
//   business_email,
//   home_phone,
//   business_phone,
//   cell_phone,
//   emerg_contct,
//   emrg_w_phone,
//   emgr_contct_relation,
//   alt_em_contct,
//   alt_emg_h_phone,
//   alt_emg_w_phone
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO WaiterList (emp_his_id,
//       employee_id,
//       pos_id,
//       first_name,
//       last_name,
//       email,
//       phone,
//       alter_phone,
//       present_address,
//       parmanent_address,
//       picture,
//       degree_name,
//       university_name,
//       cgp,
//       passing_year,
//       company_name,
//       working_period,
//       duties,
//       supervisor,
//       signature,
//       is_admin,
//       dept_id,
//       division_id,
//       maiden_name,
//       state,
//       city,
//       zip,
//       citizenship,
//       duty_type,
//       hire_date,
//       original_hire_date,
//       termination_date,
//       termination_reason,
//       voluntary_termination,
//       rehire_date,
//       rate_type,
//       rate,
//       pay_frequency,
//       pay_frequency_txt,
//       hourly_rate2,
//       hourly_rate3,
//       home_department,
//       department_text,
//       class_code,
//       class_code_desc,
//       class_acc_date,
//       class_status,
//       is_super_visor,
//       super_visor_id,
//       supervisor_report,
//       dob,
//       gender,
//       country,
//       marital_status,
//       ethnic_group,
//       eeo_class_gp,
//       ssn,
//       work_in_state,
//       live_in_state,
//       home_email,
//       business_email,
//       home_phone,
//       business_phone,
//       cell_phone,
//       emerg_contct,
//       emrg_w_phone,
//       emgr_contct_relation,
//       alt_em_contct,
//       alt_emg_h_phone,
//       alt_emg_w_phone) VALUES(?, ?, ?,?,?,?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?,?, ?, ?,?,?,?,?,?,?,?)`,
//     [
//       emp_his_id,
//       employee_id,
//       pos_id,
//       first_name,
//       last_name,
//       email,
//       phone,
//       alter_phone,
//       present_address,
//       parmanent_address,
//       picture,
//       degree_name,
//       university_name,
//       cgp,
//       passing_year,
//       company_name,
//       working_period,
//       duties,
//       supervisor,
//       signature,
//       is_admin,
//       dept_id,
//       division_id,
//       maiden_name,
//       state,
//       city,
//       zip,
//       citizenship,
//       duty_type,
//       hire_date,
//       original_hire_date,
//       termination_date,
//       termination_reason,
//       voluntary_termination,
//       rehire_date,
//       rate_type,
//       rate,
//       pay_frequency,
//       pay_frequency_txt,
//       hourly_rate2,
//       hourly_rate3,
//       home_department,
//       department_text,
//       class_code,
//       class_code_desc,
//       class_acc_date,
//       class_status,
//       is_super_visor,
//       super_visor_id,
//       supervisor_report,
//       dob,
//       gender,
//       country,
//       marital_status,
//       ethnic_group,
//       eeo_class_gp,
//       ssn,
//       work_in_state,
//       live_in_state,
//       home_email,
//       business_email,
//       home_phone,
//       business_phone,
//       cell_phone,
//       emerg_contct,
//       emrg_w_phone,
//       emgr_contct_relation,
//       alt_em_contct,
//       alt_emg_h_phone,
//       alt_emg_w_phone,
//     ],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//waiter dropdown end here

//Payment page
ipcMain.on("PaymentMethod", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const paymentMethod = `SELECT PaymentList.payment_method, PaymentList.is_active FROM PaymentList`;

  db.all(paymentMethod, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("paymentMethodResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("PaymentMethod", () => {
//   gettingPaymentMethodData();
// });
// function gettingPaymentMethodData() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/paymentlist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.paymentinfo.map(
//         ({ payment_method_id, payment_method, is_active }) => {
//           insertionPaymentList(payment_method_id, payment_method, is_active);
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionPaymentList(payment_method_id, payment_method, is_active) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO PaymentList (payment_method_id, payment_method, is_active) VALUES(?, ?, ?)`,
//     [payment_method_id, payment_method, is_active],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//card terminal page
ipcMain.on("cardTerminal", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const paymentMethod = `SELECT CardTerminalList.terminal_name FROM CardTerminalList`;

  db.all(paymentMethod, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("cardTerminalResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("cardTerminal", () => {
//   gettingCardTerminalData();
// });

// function gettingCardTerminalData() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/cardterminallist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.bankinfo.map(({ card_terminalid, terminal_name }) => {
//         insertionCardTerminal(card_terminalid, terminal_name);
//       });
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionCardTerminal(card_terminalid, terminal_name) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO CardTerminalList (card_terminalid, terminal_name) VALUES(?, ?)`,
//     [card_terminalid, terminal_name],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }

//bank page
ipcMain.on("bank", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const bankData = `SELECT bank_name FROM BankList`;

  db.all(bankData, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("bankResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("bank", () => {
//   gettingBankData();
// });
// function gettingBankData() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/banklist", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.bankinfo.map(
//         ({ bankid, bank_name, ac_name, ac_number, branch, signature_pic }) => {
//           insertionCardTerminal(
//             bankid,
//             bank_name,
//             ac_name,
//             ac_number,
//             branch,
//             signature_pic
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionCardTerminal(
//   bankid,
//   bank_name,
//   ac_name,
//   ac_number,
//   branch,
//   signature_pic
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO BankList (bankid, bank_name,ac_name,ac_number,branch,signature_pic) VALUES(?,?,?,?,?,?)`,
//     [bankid, bank_name, ac_name, ac_number, branch, signature_pic],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//Settings page start here
ipcMain.on("settingsLoaded", () => {
  const db = new sqlite3.Database("./database.sqlite");

  const settingDta = `SELECT * FROM Setting`;

  db.all(settingDta, [], (err, rows) => {
    if (err) {
      throw err;
    }
    mainWin.webContents.send("settingsResultSent", rows);
  });

  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
  });
});
// ipcMain.on("settingsLoaded", () => {
//   gettingSetting();
// });
// function gettingSetting() {
//   const form = new FormData();
//   form.append("android", 123);

//   fetch("https://restaurant.bdtask.com/demo/app/setinginfo", {
//     method: "POST",
//     body: form,
//   })
//     .then((response) => response.json())
//     .then((data) => {
//       data.data.setinginfo.map(
//         ({
//           title,
//           storename,
//           address,
//           email,
//           phone,
//           logo,
//           opentime,
//           closetime,
//           vat,
//           discount_type,
//           service_chargeType,
//           currencyname,
//           curr_icon,
//           position,
//           curr_rate,
//           min_prepare_time,
//           language,
//           timezone,
//           dateformat,
//           site_align,
//           powerbytxt,
//           footer_text,
//         }) => {
//           insertionSetting(
//             title,
//             storename,
//             address,
//             email,
//             phone,
//             logo,
//             opentime,
//             closetime,
//             vat,
//             discount_type,
//             service_chargeType,
//             currencyname,
//             curr_icon,
//             position,
//             curr_rate,
//             min_prepare_time,
//             language,
//             timezone,
//             dateformat,
//             site_align,
//             powerbytxt,
//             footer_text
//           );
//         }
//       );
//     })
//     .catch((response) => {
//       console.log(response);
//     });
// }
// function insertionSetting(
//   title,
//   storename,
//   address,
//   email,
//   phone,
//   logo,
//   opentime,
//   closetime,
//   vat,
//   discount_type,
//   service_chargeType,
//   currencyname,
//   curr_icon,
//   position,
//   curr_rate,
//   min_prepare_time,
//   language,
//   timezone,
//   dateformat,
//   site_align,
//   powerbytxt,
//   footer_text
// ) {
//   const db = new sqlite3.Database("./database.sqlite");

//   db.run(
//     `INSERT INTO Setting (title,storename,address,email,phone, logo, opentime, closetime, vat, discount_type,service_chargeType,currencyname,curr_icon,position,curr_rate,min_prepare_time,language,timezone,dateformat,site_align,powerbytxt,footer_text,row_per_page,favicon,max_page_per_sheet,sync_short_delay,sync_long_delay,stock_validation) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
//     [
//       title,
//       storename,
//       address,
//       email,
//       phone,
//       logo,
//       opentime,
//       closetime,
//       vat,
//       discount_type,
//       service_chargeType,
//       currencyname,
//       curr_icon,
//       position,
//       curr_rate,
//       min_prepare_time,
//       language,
//       timezone,
//       dateformat,
//       site_align,
//       powerbytxt,
//       footer_text,
//       "30",
//       "applicationmodulesdependancyimages\favicon",
//       "20",
//       "00:05",
//       "01:00",
//       "0",
//     ],
//     function (err) {
//       if (err) {
//         return console.log("Error message", err.message);
//       }
//       console.log(`A row has been inserted with rowid ${this.lastID}`);
//     }
//   );
//   db.close();
// }
//stettings page end here

// start of menu
const menuTemplate = [
  //start of view menu
  {
    label: "View",
    submenu: [
      {
        label: "Foods...",
        click: () => {
          mainWin.loadURL(`file://${__dirname}/assests/html/food.html`);
        },
      },

      {
        label: "Food Add-ons...",
        click: () => {
          mainWin.loadURL(`file://${__dirname}/assests/html/food_addsOn.html`);
        },
      },

      {
        label: "Food Category...",
        click: () => {
          mainWin.loadURL(
            `file://${__dirname}/assests/html/food_category.html`
          );
        },
      },

      {
        label: "Tables...",
        click: () => {
          mainWin.loadURL(`file://${__dirname}/assests/html/food_table.html`);
        },
      },

      {
        label: "Customer Type...",
        click: () => {
          mainWin.loadURL(
            `file://${__dirname}/assests/html/customer_type.html`
          );
        },
      },

      {
        label: "Payment...",
        click: () => {
          mainWin.loadURL(`file://${__dirname}/assests/html/payment.html`);
        },
      },
    ],
  },

  //Start of manage order menu
  {
    label: "Manage Order",
    submenu: [
      {
        label: "Order...",
        click: () => {
          mainWin.loadURL(`file://${__dirname}/assests/html/order.html`);
        },
      },
      {
        label: "POS...",
        click: () => {
          mainWin.loadURL(`file://${__dirname}/assests/html/pos.html`);
        },
      },
    ],
  },

  //Start of setting menu
  {
    label: "Setting",
    submenu: [
      {
        label: "Application Setting...",
        click: () => {
          mainWin.loadURL(
            `file://${__dirname}/assests/html/synchronization.html`
          );
        },
      },
      {
        label: "Synchronization...",
        role: "Synchronization...",
      },
    ],
  },

  //Help
  {
    label: "Help",
    submenu: [
      {
        label: "Learn More",
        click: async () => {
          const { shell } = require("electron");
          await shell.openExternal("https://electronjs.org");
        },
      },
    ],
  },

  //start of the development menu
  {
    label: "DevToolswithReload",
    submenu: [
      {
        label: "DEV tools",
        role: "toggleDevTools",
      },
      {
        label: "Reload",
        role: "reload",
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
