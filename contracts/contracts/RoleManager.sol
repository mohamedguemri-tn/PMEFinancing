// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RoleManager
 * @dev Manage user roles for an SME financing platform using OpenZeppelin AccessControl.
 */
contract RoleManager is AccessControl {
    bytes32 public constant PME = keccak256("PME");
    bytes32 public constant INVESTOR = keccak256("INVESTOR");
    bytes32 public constant GUARANTOR = keccak256("GUARANTOR");
    bytes32 public constant GOVERNOR = keccak256("GOVERNOR");

    event UserRegistered(address indexed account, bytes32 indexed role);
    event UserRevoked(address indexed account, bytes32 indexed role);

    /**
     * @dev Grants the GOVERNOR role to the deployer and sets up role administration.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR, msg.sender);
        _setRoleAdmin(PME, GOVERNOR);
        _setRoleAdmin(INVESTOR, GOVERNOR);
        _setRoleAdmin(GUARANTOR, GOVERNOR);
        _setRoleAdmin(GOVERNOR, GOVERNOR);
    }

    /**
     * @notice Register a user with a specific role.
     * @dev Can only be called by an account with the GOVERNOR role.
     * @param account The address of the user to register.
     * @param role The role to assign to the user.
     */
    function registerUser(address account, bytes32 role) external onlyRole(GOVERNOR) {
        require(account != address(0), "RoleManager: account is the zero address");
        require(_isSupportedRole(role), "RoleManager: unsupported role");
        _grantRole(role, account);
        emit UserRegistered(account, role);
    }

    /**
     * @notice Revoke all supported roles from a user.
     * @dev Can only be called by an account with the GOVERNOR role.
     * @param account The address of the user whose roles will be revoked.
     */
    function revokeUser(address account) external onlyRole(GOVERNOR) {
        require(account != address(0), "RoleManager: account is the zero address");

        if (hasRole(PME, account)) {
            _revokeRole(PME, account);
            emit UserRevoked(account, PME);
        }
        if (hasRole(INVESTOR, account)) {
            _revokeRole(INVESTOR, account);
            emit UserRevoked(account, INVESTOR);
        }
        if (hasRole(GUARANTOR, account)) {
            _revokeRole(GUARANTOR, account);
            emit UserRevoked(account, GUARANTOR);
        }
        if (hasRole(GOVERNOR, account) && account != msg.sender) {
            _revokeRole(GOVERNOR, account);
            emit UserRevoked(account, GOVERNOR);
        }
    }



    /**
     * @dev Returns true if the role is one of the supported role constants.
     * @param role The role identifier to validate.
     */
    function _isSupportedRole(bytes32 role) internal pure returns (bool) {
        return role == PME || role == INVESTOR || role == GUARANTOR || role == GOVERNOR;
    }
}
