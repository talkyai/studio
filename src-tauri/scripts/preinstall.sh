#!/bin/sh
# RPM pre-install script
# $1: 1=install, 2=upgrade, 0=uninstall (per RPM conventions)
echo "-------------"
echo "This is pre"
echo "Install Value: $1"
echo "Upgrade Value: $1"
echo "Uninstall Value: $1"
echo "-------------"
