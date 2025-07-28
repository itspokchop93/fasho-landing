interface DeadlineInfo {
  message: string;
  color: string;
  backgroundColor: string;
  textColor: string;
  showDeadline: boolean;
}

export const calculateDeadline = (orderDate: string, orderStatus: string): DeadlineInfo => {
  // Only show deadline for processing orders
  if (orderStatus !== 'processing') {
    return {
      message: '',
      color: '',
      backgroundColor: '',
      textColor: '',
      showDeadline: false
    };
  }

  // Parse the order date and add 48 hours for deadline
  const orderDateTime = new Date(orderDate);
  const deadlineDateTime = new Date(orderDateTime.getTime() + (48 * 60 * 60 * 1000)); // Add 48 hours
  const currentTime = new Date();
  
  // Calculate the difference in milliseconds
  const timeDifference = deadlineDateTime.getTime() - currentTime.getTime();
  
  // Convert to hours (rounded to nearest hour)
  const hoursDifference = Math.round(timeDifference / (1000 * 60 * 60));
  
  let message: string;
  let color: string;
  let backgroundColor: string;
  let textColor: string;

  if (hoursDifference > 0) {
    // Before deadline
    message = `${hoursDifference} Hour${hoursDifference !== 1 ? 's' : ''} left to start!`;
    
    // Color coding based on hours left
    if (hoursDifference >= 24) {
      // 48hrs - 24hrs left (Green)
      color = '#10B981'; // Emerald-500
      backgroundColor = '#D1FAE5'; // Emerald-100
      textColor = '#065F46'; // Emerald-800
    } else if (hoursDifference >= 12) {
      // 24hrs - 12hrs left (Yellow)  
      color = '#F59E0B'; // Amber-500
      backgroundColor = '#FEF3C7'; // Amber-100
      textColor = '#92400E'; // Amber-800
    } else {
      // 12hrs - 1hrs left (Orange)
      color = '#F97316'; // Orange-500
      backgroundColor = '#FED7AA'; // Orange-100
      textColor = '#9A3412'; // Orange-800
    }
  } else {
    // Past deadline
    const hoursPast = Math.abs(hoursDifference);
    message = `${hoursPast} Hour${hoursPast !== 1 ? 's' : ''} past deadline!`;
    
    // Bright red for past deadline
    color = '#EF4444'; // Red-500
    backgroundColor = '#FEE2E2'; // Red-100
    textColor = '#991B1B'; // Red-800
  }

  return {
    message,
    color,
    backgroundColor,
    textColor,
    showDeadline: true
  };
}; 