// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title LoanManager
 * @dev Manage loan lifecycle for SME assets using ERC721 collateral and role-based access control.
 */
contract LoanManager is AccessControl, ReentrancyGuard {
    bytes32 public constant PME = keccak256("PME");
    bytes32 public constant INVESTOR = keccak256("INVESTOR");
    bytes32 public constant GOVERNOR = keccak256("GOVERNOR");

    enum LoanStatus {
        REQUESTED,
        FUNDED,
        REPAID,
        DEFAULTED
    }

    struct Loan {
        address pme;
        address investor;
        uint256 collateralTokenId;
        uint256 amount;
        uint256 durationDays;
        uint256 fundedAt;
        uint256 dueAt;
        LoanStatus status;
    }

    IERC721 public immutable collateralToken;
    address public roleManager;
    uint256 private _nextLoanId;
    mapping(uint256 => Loan) private _loans;

    event LoanRequested(uint256 indexed loanId, address indexed pme, uint256 collateralTokenId, uint256 amount, uint256 durationDays);
    event LoanFunded(uint256 indexed loanId, address indexed investor, uint256 amount, uint256 dueAt);
    event LoanRepaid(uint256 indexed loanId, address indexed pme, uint256 amount);
    event CollateralLiquidated(uint256 indexed loanId, address indexed investor, uint256 collateralTokenId);

    /**
     * @dev Sets the RoleManager and collateral ERC721 token contract, and grants GOVERNOR role to deployer.
     * @param roleManagerAddress The deployed RoleManager contract address.
     * @param tokenAddress The address of the ERC721 collateral token contract.
     */
    constructor(address roleManagerAddress, address tokenAddress) {
        require(roleManagerAddress != address(0), "LoanManager: invalid RoleManager address");
        require(tokenAddress != address(0), "LoanManager: token address is zero");

        roleManager = roleManagerAddress;
        collateralToken = IERC721(tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR, msg.sender);
        _setRoleAdmin(PME, GOVERNOR);
        _setRoleAdmin(INVESTOR, GOVERNOR);
        _setRoleAdmin(GOVERNOR, GOVERNOR);
    }

    /**
     * @notice Request a loan by locking an ERC721 collateral token.
     * @dev Can only be called by an account with the PME role.
     * @param collateralTokenId The token ID of the collateral asset.
     * @param amount The requested loan amount in wei.
     * @param durationDays The loan duration in days.
     * @return loanId The identifier of the created loan request.
     */
    function requestLoan(uint256 collateralTokenId, uint256 amount, uint256 durationDays)
        external
        onlyRole(PME)
        returns (uint256 loanId)
    {
        require(amount > 0, "LoanManager: amount must be greater than zero");
        require(durationDays > 0, "LoanManager: duration must be greater than zero");
        require(collateralToken.ownerOf(collateralTokenId) == msg.sender, "LoanManager: caller is not owner of collateral");

        loanId = _nextLoanId++;
        collateralToken.transferFrom(msg.sender, address(this), collateralTokenId);

        _loans[loanId] = Loan({
            pme: msg.sender,
            investor: address(0),
            collateralTokenId: collateralTokenId,
            amount: amount,
            durationDays: durationDays,
            fundedAt: 0,
            dueAt: 0,
            status: LoanStatus.REQUESTED
        });

        emit LoanRequested(loanId, msg.sender, collateralTokenId, amount, durationDays);
    }

    /**
     * @notice Fund a requested loan by sending ETH to the PME.
     * @dev Can only be called by an account with the INVESTOR role.
     * @param loanId The identifier of the loan to fund.
     */
    function fundLoan(uint256 loanId) external payable onlyRole(INVESTOR) nonReentrant {
        Loan storage loan = _loans[loanId];
        require(loan.status == LoanStatus.REQUESTED, "LoanManager: loan is not requested");
        require(msg.value == loan.amount, "LoanManager: incorrect funding amount");
        require(loan.pme != address(0), "LoanManager: invalid PME");

        loan.investor = msg.sender;
        loan.fundedAt = block.timestamp;
        loan.dueAt = block.timestamp + (loan.durationDays * 1 days);
        loan.status = LoanStatus.FUNDED;

        (bool success, ) = payable(loan.pme).call{value: msg.value}("");
        require(success, "LoanManager: transfer to PME failed");

        emit LoanFunded(loanId, msg.sender, msg.value, loan.dueAt);
    }

    /**
     * @notice Repay a funded loan and release collateral when fully repaid.
     * @dev Can only be called by the PME who requested the loan.
     * @param loanId The identifier of the loan to repay.
     */
    function repayLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = _loans[loanId];
        require(loan.status == LoanStatus.FUNDED, "LoanManager: loan is not funded");
        require(msg.sender == loan.pme, "LoanManager: only PME can repay");
        require(msg.value >= loan.amount, "LoanManager: repayment amount insufficient");

        loan.status = LoanStatus.REPAID;

        collateralToken.transferFrom(address(this), loan.pme, loan.collateralTokenId);

        if (msg.value > loan.amount) {
            payable(msg.sender).transfer(msg.value - loan.amount);
        }

        emit LoanRepaid(loanId, loan.pme, msg.value);
    }

    /**
     * @notice Liquidate collateral for an overdue funded loan.
     * @dev Can only be called by the INVESTOR who funded the loan.
     * @param loanId The identifier of the loan to liquidate.
     */
    function liquidateCollateral(uint256 loanId) external nonReentrant onlyRole(INVESTOR) {
        Loan storage loan = _loans[loanId];
        require(loan.status == LoanStatus.FUNDED, "LoanManager: loan is not funded");
        require(msg.sender == loan.investor, "LoanManager: only funding investor can liquidate");
        require(block.timestamp > loan.dueAt, "LoanManager: loan is not overdue");

        loan.status = LoanStatus.DEFAULTED;
        collateralToken.transferFrom(address(this), loan.investor, loan.collateralTokenId);

        emit CollateralLiquidated(loanId, loan.investor, loan.collateralTokenId);
    }

    /**
     * @notice Get loan details by loan ID.
     * @param loanId The identifier of the loan.
     * @return pme The PME address that requested the loan.
     * @return investor The investor address that funded the loan.
     * @return collateralTokenId The ERC721 collateral token ID.
     * @return amount The loan amount in wei.
     * @return durationDays The loan duration in days.
     * @return fundedAt Timestamp when loan was funded.
     * @return dueAt Timestamp when loan repayment is due.
     * @return status The current loan status.
     */
    function getLoan(uint256 loanId)
        external
        view
        returns (
            address pme,
            address investor,
            uint256 collateralTokenId,
            uint256 amount,
            uint256 durationDays,
            uint256 fundedAt,
            uint256 dueAt,
            LoanStatus status
        )
    {
        Loan memory loan = _loans[loanId];
        return (
            loan.pme,
            loan.investor,
            loan.collateralTokenId,
            loan.amount,
            loan.durationDays,
            loan.fundedAt,
            loan.dueAt,
            loan.status
        );
    }

    /**
     * @dev Override required by Solidity for supportsInterface when inheriting AccessControl.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
