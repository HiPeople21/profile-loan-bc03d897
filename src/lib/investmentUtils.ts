export const calculateMinInvestment = (loanAmount: number): number => {
  if (loanAmount <= 1000) {
    return loanAmount; // 100% for loans up to $1,000
  } else if (loanAmount <= 10000) {
    return loanAmount * 0.05; // 5% for $1,000 - $10,000
  } else if (loanAmount <= 100000) {
    return loanAmount * 0.10; // 10% for $10,000 - $100,000
  } else {
    return loanAmount * 0.20; // 20% for $1M+
  }
};

export const formatMinInvestment = (minAmount: number): string => {
  return `$${minAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
