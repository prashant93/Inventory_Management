#!/usr/bin/env node

const clear = require('clear')
const chalk = require('chalk')

clear();
console.log(chalk.yellowBright.bold("INPUT FORMAT: (no space between separators) <purchase_country>:<optional_passport_number>:<item_type>:<number_of_units_to_be_ordered>:<item_type>:<number_of_units_to_be_ordered>"));

let myArgs = process.argv.slice(2);

let total_sale_price = 0;
let transport_cost = 400;
let inventoryObject = {
    purchaseCountry: "",
    passport_number: "",
    itemList: []
};
let inventoryStock = {
    UK: [{ item: "Mask", qty: 100, unit_price: 65 }, { item: "Gloves", qty: 100, unit_price: 100 }],
    Germany: [{ item: "Mask", qty: 100, unit_price: 100 }, { item: "Gloves", qty: 50, unit_price: 150 }]
}
let resetInventory = () => { return inventoryStock }

let inventoryFlatData = () => {
    let data = []
    for (let key in inventoryStock) {
        if (Array.isArray(inventoryStock[key])) {
            inventoryStock[key].forEach(element => {
                element.country = key
                data.push(element)
            });
        }
    }
    return data;
}


if (myArgs) {
    resetInventory();

    let inventorydata = inventoryFlatData();
    let argumentsList = myArgs.toString().split(":");
    if (argumentsList.length < 5) {
        console.log(chalk.redBright.bold("Error in INPUT FORMAT"));
        console.log(chalk.redBright.bold("Expected INPUT FORMAT: (no space between separators) <purchase_country>:<optional_passport_number>:<item_type>:<number_of_units_to_be_ordered>:<item_type>:<number_of_units_to_be_ordered>"));
        return;
    }

    inventoryObject.purchaseCountry = argumentsList[0];
    if (argumentsList[1].startsWith("A") || argumentsList[1].startsWith("B")) {
        inventoryObject.passport_number = argumentsList[1];
        inventoryObject.itemList.push({
            type: argumentsList[2],
            qty: parseInt(argumentsList[3])
        })
        inventoryObject.itemList.push({
            type: argumentsList[4],
            qty: parseInt(argumentsList[5])
        })
    } else {
        inventoryObject.passport_number = "";
        inventoryObject.itemList.push({
            type: argumentsList[1],
            qty: parseInt(argumentsList[2])
        })
        inventoryObject.itemList.push({
            type: argumentsList[3],
            qty: parseInt(argumentsList[4])
        })
    }

    for (let index = 0; index < inventoryObject.itemList.length; index++) {
        const element = inventoryObject.itemList[index];
        if (!checkStock(element.type, element.qty)) {
            console.log(chalk.blueBright.bold("Input", (myArgs.toString())));
            console.log(chalk.redBright.bold("Output", "Out_of_Stock:" + inventoryStock.UK[0].qty + ":" + inventoryStock.Germany[0].qty + " " + inventoryStock.UK[1].qty + ":" + inventoryStock.Germany[1].qty));
            return;
        }
        let leastitemPrice = calculateLeastUnitPrice(inventorydata, element.type);
        let qty = element.qty > leastitemPrice.qty ? leastitemPrice.qty : (element.qty - element.qty % 10);
        let remainingqty = element.qty > leastitemPrice.qty ? Math.abs(leastitemPrice.qty - element.qty) : element.qty - (element.qty - element.qty % 10);
        total_sale_price += leastitemPrice.unit_price * qty;
        let inventorydataObj = inventoryStock[leastitemPrice.country].find(x => x.item == element.type)
        inventorydataObj.qty = inventorydataObj.qty - qty;

        if (remainingqty > 0) {
            let price = inventorydata.find(x => x.country != leastitemPrice.country && x.item == element.type)
            total_sale_price += price.base_price * remainingqty;
            // transport cost
            total_sale_price += ((price.unit_price - price.base_price) * Math.ceil(remainingqty / 10)) * 10;

            let inventorydataObj = inventoryStock[price.country].find(x => x.item == element.type)
            inventorydataObj.qty = inventorydataObj.qty - remainingqty;
        }
    }

    console.log(chalk.blueBright.bold("Input", (myArgs.toString())));
    console.log(chalk.greenBright.bold("OutPut", total_sale_price + ":" + inventoryStock.UK[0].qty + ":" + inventoryStock.Germany[0].qty + " " + inventoryStock.UK[1].qty + ":" + inventoryStock.Germany[1].qty));
}


// helper -- todo will move to module helper file
function checkStock(item, orderqty) {
    let ukStock = inventoryStock.UK.find(x => x.item == item);
    let germanyStock = inventoryStock.Germany.find(x => x.item == item);
    return orderqty > ukStock.qty + germanyStock.qty ? false : true;
}

function calculateLeastUnitPrice(inventorydata, item) {
    let itemObj = inventorydata.filter(x => x.item == item);
    itemObj.forEach(element => {
        element.base_price = element.unit_price;
        if (inventoryObject.purchaseCountry != element.country) {
            transport_cost = 40;
            if (getCountryBasedOnPassport(inventoryObject.passport_number) == element.country && inventoryObject.passport_number != '') {
                transport_cost = transport_cost - (transport_cost * 20 / 100);
                element.unit_price = element.unit_price + transport_cost;
            } else {
                element.unit_price = element.unit_price + transport_cost;
            }
        }
    });
    return itemObj.reduce((prev, current) => (prev.unit_price > current.unit_price) ? current : prev);
}

function getCountryBasedOnPassport(passportNumber) {
    let UKPassPortValidator = /^[B]{1}\d{3}[a-zA-Z]{2}[a-zA-Z0-9]{7}$/;
    let GermanyPassPortValidator = /^[A]{1}[a-zA-Z]{2}[a-zA-Z0-9]{9}$/;
    return UKPassPortValidator.test(passportNumber) ? "UK" : "Germany";
}