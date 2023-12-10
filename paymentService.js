const constants = require("./constants");
const math = require('math');

class paymentService{

    /**
   * Helper methods
   */
  percentageAmountCalculator(amount,percentage){
    return (amount * percentage/100);
  }

  calculateVAT(amount){
    return percentageAmountCalculator(amount, 15);
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
        var daysDiff = math.abs(totalRentalDays - earlyRentalDays);
        var charge = rentalamount/daysDiff;
        var diff = rentalamount - charge;
        return percentageAmountCalculator(diff, 50);

  }

  dateDifferenceInDays(startdt, enddt){
    
    if(startdt == enddt)
      return 1;

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
      
      var enddate = new Date(enddt);
      var stardate = new Date(startdt);
      var utcEnd = Date.UTC(enddate.getFullYear(), enddate.getMonth(), enddate.getDate()) 
      var utcStart = Date.UTC(stardate.getFullYear(), stardate.getMonth(), stardate.getDate()) 
      return Math.floor((utcEnd - utcStart)/MS_PER_DAY);
  }
}
module.exports = paymentService