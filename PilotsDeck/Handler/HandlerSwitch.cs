﻿using System;
using Serilog;

namespace PilotsDeck
{
    public class HandlerSwitch : HandlerBase, IHandlerSwitch
    {
        public ModelSwitch CommonSettings { get; }
        
        public override string DefaultImage { get { return CommonSettings.DefaultImage; } }
        public override string ErrorImage { get { return CommonSettings.ErrorImage; } }
        public override bool IsInitialized { get { return CommonSettings.IsInitialized; } }

        public override string ActionID { get { return $"{Title} | Write: {CommonSettings.AddressAction}"; } }
        public virtual string AddressAction { get { return CommonSettings.AddressAction; } }
        public virtual int ActionType { get { return CommonSettings.ActionType; } }

        protected virtual string currentValue { get; set; }


        public HandlerSwitch(string context, ModelSwitch settings) : base(context, settings)
        {
            CommonSettings = settings;
            currentValue = CommonSettings.OffState;
        }

        public override void Update()
        {
            if (!string.IsNullOrEmpty(CommonSettings.AddressAction))
                CommonSettings.IsInitialized = true;
            else
                CommonSettings.IsInitialized = false;

            currentValue = CommonSettings.OffState;
        }

        public virtual bool Action(IPCManager ipcManager)
        {
            string newValue = ToggleValue(currentValue, CommonSettings.OffState, CommonSettings.OnState);
            bool result = RunAction(ipcManager, CommonSettings.AddressAction, (ActionSwitchType)CommonSettings.ActionType, newValue);
            if (result)
                currentValue = newValue;

            return result;
        }

        public static string ToggleValue(string lastValue, string offState, string onState)
        {
            string newValue;
            if (lastValue == offState)
                newValue = onState;
            else
                newValue = offState;
            Log.Logger.Verbose($"Value toggled {lastValue} -> {newValue}");
            return newValue;
        }

        public static bool RunAction(IPCManager ipcManager, string Address, ActionSwitchType actionType, string newValue)
        {
            if (ipcManager.IsConnected && IPCTools.IsWriteAddress(Address, actionType))
            {
                Log.Logger.Verbose($"HandlerBase:RunAction Writing to {Address}");
                switch (actionType)
                {
                    case ActionSwitchType.MACRO:
                        return RunMacros(ipcManager, Address);
                    case ActionSwitchType.SCRIPT:
                        return RunScript(ipcManager, Address);
                    case ActionSwitchType.LVAR:
                        return WriteLvars(ipcManager, Address, newValue);
                    case ActionSwitchType.CONTROL:
                        return SendControls(ipcManager, Address);
                    case ActionSwitchType.OFFSET:
                        return WriteOffset(ipcManager, Address, newValue);
                    default:
                        return false;
                }
            }
            else
                Log.Logger.Error($"HandlerBase:RunAction not connected or Address not passed {Address}");

            return false;
        }

        public static bool RunScript(IPCManager ipcManager, string address)
        {
            return ipcManager.RunScriptMacro(address);
        }

        public static bool RunMacros(IPCManager ipcManager, string address)
        {
            bool result = false;

            string[] tokens = address.Split(':');
            if (tokens.Length == 2)
                result = ipcManager.RunScriptMacro(address);
            else
            {
                string macroFile = tokens[0];
                int fails = 0;
                for (int i = 1; i < tokens.Length; i++)
                {
                    if (!ipcManager.RunScriptMacro(macroFile + ":" + tokens[i]))
                        fails++;
                }
                if (fails == 0)
                    result = true;
            }

            return result;
        }

        public static bool WriteLvars(IPCManager ipcManager, string address, string newValue)
        {
            bool result = false;
            if (newValue?.Length < 1)
                return result;

            double value = Convert.ToDouble(newValue);

            string[] vars = address.Replace("L:", "").Split(':');
            if (vars.Length > 1)
            {
                int fails = 0;
                for (int i = 0; i < vars.Length; i++)
                {
                    if (!ipcManager.WriteLvar(vars[i], value))
                        fails++;
                }
                if (fails == 0)
                    result = true;
            }
            else
            {
                result = ipcManager.WriteLvar(address, value);
            }

            return result;
        }

        public static bool SendControls(IPCManager ipcManager, string address)
        {
            bool result = false;

            string[] args = address.Split(':');
            if (args.Length == 2)
                result = ipcManager.SendControl(args[0], args[1]);
            else if (args.Length == 1)
                result = ipcManager.SendControl(args[0]);
            else if (args.Length > 2)
            {
                string control = args[0];
                int fails = 0;
                for (int i = 0; i < args.Length; i++)
                {
                    if (!ipcManager.SendControl(control, args[i]))
                        fails++;
                }
                if (fails == 0)
                    result = true;
            }
            else
            {
                Log.Logger.Error($"HandlerBase: Could not resolve Control-Address: {address}");
                return false;
            }

            return result;
        }

        public static bool WriteOffset(IPCManager ipcManager, string address, string newValue)
        {
            if (newValue != "")
                return ipcManager.WriteOffset(address, newValue);
            else
                return false;
        }
    }
}