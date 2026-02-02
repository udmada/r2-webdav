# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-02-01

### Refactored with Effect-TS

This is a complete refactor of the original [r2-webdav](https://github.com/abersheeran/r2-webdav) project with enhanced error handling, security improvements, and modern functional programming patterns using Effect-TS.

### Added

- **Effect-TS Integration**: Complete refactor using Effect-TS for type-safe error handling and functional composition
- **Path Traversal Protection**: Segment-based path normalization to prevent directory traversal attacks
- **Enhanced XML Parsing**: Improved XML parser with CDATA and comment handling
- **LOCK/UNLOCK Support**: Added WebDAV locking support for Windows/macOS clients
- **Directory Listing Limits**: 10,000 item cap to prevent DoS attacks
- **Batch Delete Operations**: Optimized delete operations with 1000-key chunks
- **Proper R2 Type Handling**: Correct handling of R2Object vs R2ObjectBody return types
- **HTTP Range Support**: Full support for range requests including suffix ranges
- **304/412 Responses**: Proper conditional request handling
- **CORS Credentials**: Support for authenticated CORS requests
- **Modular Architecture**: Clean separation of concerns with handlers, utils, and r2 operations

### Changed

- **Project Structure**: Reorganized into logical directories (handlers, utils, r2)
- **Error Handling**: Moved from Promise-based to Effect-TS for better error tracking
- **Stream Processing**: Using Effect Streams for memory-efficient operations
- **Batch Operations**: Concurrent batch operations with controlled concurrency (limit: 5)
- **CORS Configuration**: Updated to support credentials with proper headers
- **Environment Variables**: Changed R2 bucket binding from `bucket` to `BUCKET`

### Fixed

- **Path Normalization**: Fixed path traversal vulnerabilities with proper segment validation
- **Null Byte Validation**: Added validation against null bytes in paths
- **Range Request Handling**: Corrected suffix range calculation
- **XML Escaping**: All XML output is now properly escaped
- **MKCOL Content-Length**: Fixed Windows Explorer compatibility by checking Content-Length
- **Delete Operations**: Fixed batch delete with proper R2 API limits (1000 keys)
- **Conditional Requests**: Proper 304/412 responses for conditional GET requests

### Security

- **Timing-Safe Comparison**: Authentication uses constant-time comparison
- **Path Validation**: Multiple layers of path validation to prevent attacks
- **XML Injection Protection**: All user input in XML responses is escaped
- **DoS Protection**: Directory listing limits prevent resource exhaustion

### Performance

- **Streaming**: Memory-efficient streaming for large file operations
- **Concurrent Operations**: Batch operations run with controlled concurrency
- **Lazy Evaluation**: Effect-TS enables lazy evaluation for better performance

## [1.0.0] - Original Release

Initial implementation by [abersheeran](https://github.com/abersheeran/r2-webdav)
