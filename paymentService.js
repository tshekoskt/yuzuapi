const constants = require("./constants");
const math = require('math');

class PaymentService {

    /**
   * Helper methods
   */
  percentageAmountCalculator(amount,percentage){
    return (amount * percentage/100);
  }

  calculateVAT(amount){
    return this.percentageAmountCalculator(amount, constants.VAT);
  }

  /**
   * RIRP-05 - The Rentee will be entitled to 50% 
   * 
   * @param {*} startdate 
   * @param {*} enddate 
   * @param {*} datereturned 
   * @param {*} rentalamount 
   * @returns 
   */
  earlyRentalReturnRefund(startdate,enddate,datereturned, rentalamount){
        var totalRentalDays = this.dateDifferenceInDays(startdate, enddate);
        var earlyRentalDays = this.dateDifferenceInDays(startdate, datereturned);
        console.log("totalRentalDays : ", totalRentalDays);
        console.log("earlyRentalDays : ", earlyRentalDays);

        if(totalRentalDays > earlyRentalDays) //early return || cancellation by rentee
        {
          var days_rented = math.abs(totalRentalDays - earlyRentalDays);
          //console.log("days_rented ", days_rented);
          var cost_per_day = rentalamount/totalRentalDays; //charge per day
          //console.log("cost_per_day ", cost_per_day);
          var cost_for_days_in_use = cost_per_day * earlyRentalDays; // days_rented;
          //console.log("cost_for_days_in_use ", cost_for_days_in_use);
          var cost_for_remaining_days = cost_per_day *  days_rented; //earlyRentalDays;
          //console.log("cost_for_remaining_days ", cost_for_remaining_days);
          var refundAmount = this.percentageAmountCalculator(cost_for_remaining_days, 50); //50% 
          //console.log("refundAmount ", refundAmount);
          var dueToRentor = cost_for_days_in_use + refundAmount;
          //console.log("dueToRentor ", dueToRentor);
          var serviceFee = this.percentageAmountCalculator(dueToRentor, constants.SERVICE_FEE_PERC);
          //console.log("serviceFee ", serviceFee);
          var vatAmount =  this.calculateVAT(dueToRentor);
          //console.log("vatAmount ", vatAmount);
          var totalDueToRentor = dueToRentor - vatAmount - serviceFee;
          //console.log("totalDueToRentor ", totalDueToRentor);

          var item = {
            vatAmount: vatAmount,
            serviceFee: serviceFee,
            totalDueToRentor : totalDueToRentor,
            renteeRefund: refundAmount,           
          }
        
          return item;
        }else{

          var serviceFee = this.percentageAmountCalculator(rentalamount, constants.SERVICE_FEE_PERC);
          var vatAmount =  this.calculateVAT(rentalamount);       
          var totalDueToRentor = rentalamount - vatAmount - serviceFee;
          var refundAmount = 0

          var item = {
            vatAmount: vatAmount,
            serviceFee: serviceFee,
            totalDueToRentor : totalDueToRentor,
            renteeRefund: refundAmount,           
          }
        
          return item;
        }
        var daysDiff = math.abs(totalRentalDays - earlyRentalDays);
        var charge = rentalamount/daysDiff;
        var diff = rentalamount - charge;
  }

  /**
   * Rentee is entitled to full refund
   * Rentor is changed 2% fee
   * @param {} startdate 
   * @param {*} enddate 
   * @param {*} datereturned 
   * @param {*} rentalamount 
   * @returns 
   */
  cancellationRentalReturnRefund(startdate,enddate,datereturned, rentalamount){
    var totalRentalDays = this.dateDifferenceInDays(startdate, enddate);
    var earlyRentalDays = this.dateDifferenceInDays(startdate, datereturned);
    

      var serviceFee = this.percentageAmountCalculator(rentalamount, constants.CANCELLATION_ADMIN_FEE_PERC);
      var vatAmount =  this.calculateVAT(serviceFee);       
      var totalDueToRentor =  - 1 * (vatAmount + serviceFee);
      var refundAmount = rentalamount;

      var item = {
        vatAmount: vatAmount,
        serviceFee: serviceFee,
        totalDueToRentor : totalDueToRentor,
        renteeRefund: refundAmount,           
      }
    
      return item;
   
}

 dateDifferenceInDays(startdt, enddt){     
    var enddate = new Date(enddt);
    var stardate = new Date(startdt);
    var utcEnd = Date.UTC(enddate.getFullYear(), enddate.getMonth(), enddate.getDate()) 
    var utcStart = Date.UTC(stardate.getFullYear(), stardate.getMonth(), stardate.getDate()) 

    if(utcEnd == utcStart)
      return 1;

    const MS_PER_DAY = 1000 * 60 * 60 * 24;      
    
    return Math.floor((utcEnd - utcStart)/MS_PER_DAY);

  }
}

module.exports = PaymentService