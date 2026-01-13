import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings
import React

@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {
  
  private let activityCenter = DeviceActivityCenter()
  private let store = ManagedSettingsStore()
  
  // MARK: - Authorization
  
  @objc
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    Task {
      do {
        if #available(iOS 16.0, *) {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          DispatchQueue.main.async {
            resolve(["authorized": true])
          }
        } else {
          // iOS 15 fallback
          DispatchQueue.main.async {
            reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
          }
        }
      } catch {
        DispatchQueue.main.async {
          reject("AUTH_ERROR", "Failed to authorize: \(error.localizedDescription)", error)
        }
      }
    }
  }
  
  @objc
  func checkAuthorizationStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                                rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      let status = AuthorizationCenter.shared.authorizationStatus
      let statusString: String
      
      switch status {
      case .notDetermined:
        statusString = "notDetermined"
      case .denied:
        statusString = "denied"
      case .approved:
        statusString = "approved"
      @unknown default:
        statusString = "unknown"
      }
      
      resolve([
        "status": statusString,
        "isAuthorized": status == .approved
      ])
    } else {
      reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
    }
  }
  
  // MARK: - Screen Time Usage
  
  @objc
  func getScreenUsage(_ appBundleIds: [String],
                     startDate: Double,
                     endDate: Double,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    if #available(iOS 16.0, *) {
      // Check authorization first
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        reject("NOT_AUTHORIZED", "Screen Time access not authorized", nil)
        return
      }
      
      // Note: DeviceActivityReport requires a SwiftUI view to display data
      // For actual usage monitoring, we need to set up DeviceActivity monitoring
      // and get callbacks when thresholds are met
      
      // For now, we'll return a mock structure that shows how this would work
      // In production, you'd need to implement DeviceActivityReport extension
      
      let usageData = appBundleIds.map { bundleId in
        return [
          "bundleId": bundleId,
          "totalTime": 0, // Would come from DeviceActivityReport
          "pickups": 0,
          "notifications": 0
        ] as [String : Any]
      }
      
      resolve([
        "apps": usageData,
        "totalTime": 0,
        "message": "Note: Full usage data requires implementing DeviceActivityReport extension"
      ])
    } else {
      reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
    }
  }
  
  // MARK: - App Blocking
  
  @objc
  func blockApps(_ appBundleIds: [String],
                resolver resolve: @escaping RCTPromiseResolveBlock,
                rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    if #available(iOS 16.0, *) {
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        reject("NOT_AUTHORIZED", "Screen Time access not authorized", nil)
        return
      }
      
      Task {
        do {
          // Create application tokens from bundle IDs
          let tokens = appBundleIds.compactMap { bundleId -> ApplicationToken? in
            // In a real implementation, you'd need to get the proper ApplicationToken
            // This requires using FamilyActivityPicker to let users select apps
            return nil
          }
          
          // Shield the applications
          store.shield.applications = Set(tokens)
          
          DispatchQueue.main.async {
            resolve([
              "blocked": true,
              "count": appBundleIds.count,
              "message": "Apps blocked successfully"
            ])
          }
        } catch {
          DispatchQueue.main.async {
            reject("BLOCK_ERROR", "Failed to block apps: \(error.localizedDescription)", error)
          }
        }
      }
    } else {
      reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
    }
  }
  
  @objc
  func unblockApps(_ resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    if #available(iOS 16.0, *) {
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      store.shield.webDomains = nil
      store.shield.webDomainCategories = nil
      
      resolve([
        "blocked": false,
        "message": "All blocks removed"
      ])
    } else {
      reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
    }
  }
  
  // MARK: - Activity Monitoring
  
  @objc
  func startMonitoring(_ appBundleIds: [String],
                      thresholdMinutes: Int,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    if #available(iOS 16.0, *) {
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        reject("NOT_AUTHORIZED", "Screen Time access not authorized", nil)
        return
      }
      
      // Create a schedule for monitoring
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 0, minute: 0),
        intervalEnd: DateComponents(hour: 23, minute: 59),
        repeats: true
      )
      
      let activityName = DeviceActivityName("focusSession")
      
      do {
        try activityCenter.startMonitoring(activityName, during: schedule)
        resolve([
          "monitoring": true,
          "activityName": "focusSession",
          "thresholdMinutes": thresholdMinutes
        ])
      } catch {
        reject("MONITOR_ERROR", "Failed to start monitoring: \(error.localizedDescription)", error)
      }
    } else {
      reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
    }
  }
  
  @objc
  func stopMonitoring(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    if #available(iOS 16.0, *) {
      let activityName = DeviceActivityName("focusSession")
      activityCenter.stopMonitoring([activityName])
      
      resolve([
        "monitoring": false,
        "message": "Monitoring stopped"
      ])
    } else {
      reject("NOT_AVAILABLE", "Screen Time API requires iOS 16+", nil)
    }
  }
  
  // MARK: - React Native Required
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  @objc
  func constantsToExport() -> [AnyHashable : Any]! {
    return [
      "isAvailable": {
        if #available(iOS 16.0, *) {
          return true
        } else {
          return false
        }
      }()
    ]
  }
}
