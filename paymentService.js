const constants = require("./constants");
const math = require('math');

class PaymentService{

    /**
   * Helper methods
   */
  percentageAmountCalculator(amount,percentage){
    return (amount * percentage/100);
  }

  calculateVAT(amount){
    return percentageAmountCalculator(amount, constants.VAT);
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
        var totalRentalDays = dateDifferenceInDays(startdate, enddate);
        var earlyRentalDays = dateDifferenceInDays(startdate, datereturned);
        if(totalRentalDays > earlyRentalDays) //early return
        {
          var days_rented = math.abs(totalRentalDays - earlyRentalDays);
          var cost_per_day = rentalamount/totalRentalDays; //charge per day
          var cost_for_days_in_use = cost_per_day * days_rented;
          var cost_for_remaining_days = cost_per_day * earlyRentalDays;
          var dueToRentor = cost_for_days_in_use + refundAmount;

          var serviceFee = percentageAmountCalculator(dueToRentor, constants.SERVICE_FEE_PERC);
          var vatAmount =  calculateVAT(serviceFee);
          var refundAmount = percentageAmountCalculator(cost_for_remaining_days, 50); //50%         
          var totalDueToRentor = dueToRentor - vatAmount - serviceFee;

          var item = {
            vatAmount: vatAmount,
            serviceFee: serviceFee,
            totalDueToRentor : totalDueToRentor,
            renteeRefund: refundAmount,           
          }
        
          return item;
        }else{

          var serviceFee = percentageAmountCalculator(rentalamount, constants.SERVICE_FEE_PERC);
          var vatAmount =  calculateVAT(serviceFee);       
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