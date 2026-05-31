// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract LoanPool is Ownable, ReentrancyGuard {
    IERC20 public loanToken;

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestRate;
        uint256 duration;
        uint256 createTime;
        uint256 dueDate;
        bool isRepaid;
        uint256 amountRepaid;
    }

    Loan[] public loans;
    mapping(address => uint256[]) public borrowerLoans;
    uint256 public totalLoaned;
    uint256 public totalRepaid;

    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanRepaid(uint256 indexed loanId, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId);

    constructor(address _loanToken) {
        loanToken = IERC20(_loanToken);
    }

    function createLoan(
        address borrower,
        uint256 principal,
        uint256 interestRate,
        uint256 duration
    ) public onlyOwner returns (uint256) {
        require(borrower != address(0), "Invalid borrower");
        require(principal > 0, "Principal must be > 0");

        Loan memory newLoan = Loan({
            borrower: borrower,
            principal: principal,
            interestRate: interestRate,
            duration: duration,
            createTime: block.timestamp,
            dueDate: block.timestamp + duration,
            isRepaid: false,
            amountRepaid: 0
        });

        uint256 loanId = loans.length;
        loans.push(newLoan);
        borrowerLoans[borrower].push(loanId);

        require(
            loanToken.transferFrom(msg.sender, borrower, principal),
            "Token transfer failed"
        );

        totalLoaned += principal;
        emit LoanCreated(loanId, borrower, principal);

        return loanId;
    }

    function repayLoan(uint256 loanId, uint256 amount) public nonReentrant {
        require(loanId < loans.length, "Invalid loan ID");
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Not loan borrower");
        require(!loan.isRepaid, "Loan already repaid");

        uint256 totalDue = loan.principal + calculateInterest(loanId);
        uint256 remainingDue = totalDue - loan.amountRepaid;

        require(amount > 0 && amount <= remainingDue, "Invalid repayment amount");

        require(
            loanToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        loan.amountRepaid += amount;

        if (loan.amountRepaid >= totalDue) {
            loan.isRepaid = true;
        }

        totalRepaid += amount;
        emit LoanRepaid(loanId, amount);
    }

    function calculateInterest(uint256 loanId) public view returns (uint256) {
        require(loanId < loans.length, "Invalid loan ID");
        Loan storage loan = loans[loanId];

        uint256 timeElapsed = block.timestamp > loan.dueDate
            ? loan.duration
            : block.timestamp - loan.createTime;

        return (loan.principal * loan.interestRate * timeElapsed) / (10000 * 365 days);
    }

    function getLoan(uint256 loanId) public view returns (Loan memory) {
        require(loanId < loans.length, "Invalid loan ID");
        return loans[loanId];
    }

    function getBorrowerLoans(address borrower) public view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getTotalLoans() public view returns (uint256) {
        return loans.length;
    }
}