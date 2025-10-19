export const calculateMinInvestment = (loanAmount: number): number => {
  return 100; // Minimum investment is $100
};

export const formatMinInvestment = (minAmount: number): string => {
  return `$${minAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
