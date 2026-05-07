// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AssetToken
 * @dev ERC721 token representing unique SME assets with role-based minting and lifecycle status.
 */
contract AssetToken is ERC721URIStorage, AccessControl {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant PME = keccak256("PME");
    bytes32 public constant GOVERNOR = keccak256("GOVERNOR");

    // Asset lifecycle statuses
    enum Status {
        REGISTERED,
        ATO,
        COLLATERAL,
        LIQUIDATED
    }

    // Asset data structure
    struct Asset {
        string assetType;
        Status status;
        string tokenURI;
        address owner;
    }

    // Token ID counter
    Counters.Counter private _tokenIds;

    // Mapping from tokenId to asset details
    mapping(uint256 => Asset) private _assets;

    // RoleManager contract reference
    address public roleManager;

    // Events
    event AssetTokenized(address indexed owner, uint256 indexed tokenId, string assetType, Status status);
    event AssetStatusUpdated(uint256 indexed tokenId, Status indexed previousStatus, Status indexed newStatus);

    /**
     * @dev Constructor sets the token name and symbol, stores RoleManager address, and grants deployer the GOVERNOR role.
     * @param roleManagerAddress The deployed RoleManager contract address.
     */
    constructor(address roleManagerAddress) ERC721("AssetToken", "AST") {
        require(roleManagerAddress != address(0), "AssetToken: invalid RoleManager address");
        roleManager = roleManagerAddress;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR, msg.sender);

        _setRoleAdmin(PME, GOVERNOR);
        _setRoleAdmin(GOVERNOR, GOVERNOR);
    }

    /**
     * @notice Mint a new asset token for a PME.
     * @dev Only accounts with PME role can mint.
     * @param pmeAddress Address of the PME owner.
     * @param tokenURI Metadata URI for the token.
     * @param assetType Asset type, e.g., "physical" or "intellectual".
     * @return tokenId The minted token ID.
     */
    function mint(
        address pmeAddress,
        string memory tokenURI,
        string memory assetType
    ) external onlyRole(PME) returns (uint256 tokenId) {
        require(pmeAddress != address(0), "AssetToken: invalid PME address");
        require(bytes(assetType).length > 0, "AssetToken: assetType is required");

        _tokenIds.increment();
        tokenId = _tokenIds.current();

        _safeMint(pmeAddress, tokenId);
        _setTokenURI(tokenId, tokenURI);

        _assets[tokenId] = Asset({
            assetType: assetType,
            status: Status.REGISTERED,
            tokenURI: tokenURI,
            owner: pmeAddress
        });

        emit AssetTokenized(pmeAddress, tokenId, assetType, Status.REGISTERED);
    }

    /**
     * @notice Update the lifecycle status of an asset.
     * @dev Only GOVERNOR can update status.
     */
    function setStatus(uint256 tokenId, Status newStatus) external onlyRole(GOVERNOR) {
        require(_exists(tokenId), "AssetToken: token does not exist");

        Status previousStatus = _assets[tokenId].status;
        _assets[tokenId].status = newStatus;

        emit AssetStatusUpdated(tokenId, previousStatus, newStatus);
    }

    /**
     * @notice Retrieve details of an asset token.
     */
    function getAsset(uint256 tokenId)
        external
        view
        returns (string memory assetType, Status status, string memory uri, address owner)
    {
        require(_exists(tokenId), "AssetToken: token does not exist");

        Asset memory asset = _assets[tokenId];
        return (asset.assetType, asset.status, asset.tokenURI, asset.owner);
    }

    /**
     * @dev Check if an address has PME role.
     */
    function isPme(address account) external view returns (bool) {
        return hasRole(PME, account);
    }

    /**
     * @dev Required override for multiple inheritance (ERC721URIStorage + AccessControl)
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}