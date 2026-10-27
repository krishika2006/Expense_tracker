package com.financeflow.services;

import com.financeflow.models.Transaction;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsAdviceService {

    /**
     * Analyzes transaction history to generate actionable advice.
     * 
     * @param transactions List of user transactions
     * @param monthlyBudget Map of category to budget amount
     * @return List of advice strings
     */
    public List<String> generateAdvice(List<Transaction> transactions, Map<String, BigDecimal> monthlyBudget) {
        List<String> advice = new ArrayList<>();
        
        LocalDate now = LocalDate.now();
        LocalDate startOfCurrentMonth = now.withDayOfMonth(1);
        LocalDate startOfLastMonth = startOfCurrentMonth.minusMonths(1);

        // 1. Month-over-Month Category Analysis
        Map<String, BigDecimal> currentMonthSpending = calculateSpendingByCategory(transactions, startOfCurrentMonth, now);
        Map<String, BigDecimal> lastMonthSpending = calculateSpendingByCategory(transactions, startOfLastMonth, startOfCurrentMonth);

        currentMonthSpending.forEach((category, currentAmount) -> {
            BigDecimal lastAmount = lastMonthSpending.getOrDefault(category, BigDecimal.ZERO);
            
            if (lastAmount.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal increase = currentAmount.subtract(lastAmount);
                BigDecimal percentIncrease = increase.divide(lastAmount, 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100));

                if (percentIncrease.compareTo(new BigDecimal(10)) > 0) {
                    advice.add(String.format("Your spending on '%s' increased by %.1f%% compared to last month. Consider reviewing these transactions.", 
                        category, percentIncrease.doubleValue()));
                }
            }

            // 2. Budget Overrun Detection
            BigDecimal budget = monthlyBudget.getOrDefault(category, BigDecimal.ZERO);
            if (budget.compareTo(BigDecimal.ZERO) > 0 && currentAmount.compareTo(budget) > 0) {
                advice.add(String.format("CRITICAL: You have exceeded your '%s' budget by $%s. (Budget: $%s, Spent: $%s)", 
                    category, currentAmount.subtract(budget), budget, currentAmount));
            }
        });

        // 3. Anomaly Detection (Spikes)
        BigDecimal averageTransaction = transactions.stream()
            .filter(t -> t.getType().equals("EXPENSE"))
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(new BigDecimal(Math.max(1, transactions.size())), 2, RoundingMode.HALF_UP);

        transactions.stream()
            .filter(t -> t.getType().equals("EXPENSE") && t.getDate().isAfter(now.minusDays(7)))
            .filter(t -> t.getAmount().compareTo(averageTransaction.multiply(new BigDecimal(3))) > 0)
            .forEach(t -> advice.add(String.format("Spike Detected: A large transaction of $%s at '%s' was 3x higher than your average spend.", 
                t.getAmount(), t.getDescription())));

        // 4. Operational Advice (e.g., for CHUCK'S GPF context)
        if (currentMonthSpending.getOrDefault("Dining", BigDecimal.ZERO).compareTo(new BigDecimal(500)) > 0) {
            advice.add("Advice: Third-party delivery commissions are eating into your margins. Try promoting direct pickup to save ~20%.");
        }

        return advice;
    }

    private Map<String, BigDecimal> calculateSpendingByCategory(List<Transaction> transactions, LocalDate start, LocalDate end) {
        return transactions.stream()
            .filter(t -> t.getType().equals("EXPENSE"))
            .filter(t -> !t.getDate().isBefore(start) && t.getDate().isBefore(end))
            .collect(Collectors.groupingBy(
                Transaction::getCategory,
                Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)
            ));
    }
}
